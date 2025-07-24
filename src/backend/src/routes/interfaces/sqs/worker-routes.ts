import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { request as httpsRequest, RequestOptions } from "node:https";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Route } from "../../domain/entities/route-entity";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { publishRoutesGenerated } from "../appsync-client";
import { LatLng } from "../../domain/value-objects/lat-lng-value-object";

const dynamo = new DynamoDBClient({});
const repository = new DynamoRouteRepository(dynamo, process.env.ROUTES_TABLE!);
const sm = new SecretsManagerClient({});

async function getORSKey(): Promise<string> {
  if (process.env.ORS_API_KEY) return process.env.ORS_API_KEY;
  const resp = await sm.send(new GetSecretValueCommand({ SecretId: "ORS-key" }));
  return JSON.parse(resp.SecretString!).ORS_API_KEY;
}

async function orsLeg(
  a: { lat:number; lng:number },
  b: { lat:number; lng:number },
  key: string,
  profile = "foot-walking"
) {
  const body = { coordinates: [[a.lng,a.lat],[b.lng,b.lat]], instructions:false };
  const payload = JSON.stringify(body);
  const opts: RequestOptions = {
    method: "POST",
    host: "api.openrouteservice.org",
    path: `/v2/directions/${profile}/geojson`,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      Authorization: key,
    },
  };
  const geo: any = await new Promise((resolve, reject) => {
    const req = httpsRequest(opts, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        if (res.statusCode!==200) return reject(new Error(`ORS ${res.statusCode}`));
        resolve(JSON.parse(d));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
  const sum = geo.features[0].properties.summary;
  const coords:[number,number][] = geo.features[0].geometry.coordinates;
  const encoded = Path.fromCoordinates(coords.map(([lng,lat]) => LatLng.fromNumbers(lat, lng))).Encoded;
  return { distanceMeters: sum.distance, durationSeconds: sum.duration, encoded };
}

function offsetCoordinate(lat:number,lng:number,dKm:number,bearing:number){
  const R=6371,d=dKm/R,θ=bearing*Math.PI/180,
    φ1=lat*Math.PI/180,λ1=lng*Math.PI/180;
  const φ2=Math.asin(Math.sin(φ1)*Math.cos(d)
    +Math.cos(φ1)*Math.sin(d)*Math.cos(θ));
  const λ2=λ1+Math.atan2(
    Math.sin(θ)*Math.sin(d)*Math.cos(φ1),
    Math.cos(d)-Math.sin(φ1)*Math.sin(φ2)
  );
  return { lat:φ2*180/Math.PI, lng:λ2*180/Math.PI };
}

async function computeCircularORS(
  origin:{lat:number;lng:number},
  distanceKm:number,
  segments:number,
  key:string
) {
  const radius = distanceKm/(2*Math.PI);
  const pts: {lat:number;lng:number}[] = [];
  for(let i=0;i<segments;i++){
    const raw = offsetCoordinate(origin.lat,origin.lng,radius,360/segments*i);
    pts.push(raw);
  }
  // 4.2 cose piernas y ensambla polilínea
  let totalD=0, totalT=0, encoded:string|undefined;
  for(let i=0;i<segments;i++){
    const a=pts[i], b=pts[(i+1)%segments];
    const leg = await orsLeg(a,b,key);
    totalD += leg.distanceMeters;
    totalT += leg.durationSeconds;
    if(encoded){
      const c1=new Path(encoded).Coordinates;
      const c2=new Path(leg.encoded).Coordinates.slice(1);
      encoded = Path.fromCoordinates([...c1,...c2]).Encoded;
    } else encoded = leg.encoded;
  }
  return encoded ? { distanceMeters: totalD, durationSeconds: totalT, encoded } : null;
}

export const handler: SQSHandler = async (event) => {
  console.info("event",event);
  const key = await getORSKey();

  for(const {body} of event.Records){
    const {
      jobId, origin, destination,
      distanceKm, roundTrip=false,
      circle=false, maxDeltaKm=1, routesCount=3
    } = JSON.parse(body);

    const [olng,olat]=origin.split(",").map(Number);
    const oCoords={lat:olat,lng:olng};
    const dCoords = destination
      ? (()=>{const [dlng,dlat]=destination.split(",").map(Number);return{lat:dlat,lng:dlng};})()
      : undefined;

    const saved:Route[] = [];
    const maxAtt = routesCount*5;
    let attempts = 0;

    while(saved.length<routesCount && attempts++<maxAtt){
      if(dCoords){
        console.info(`p2p attempt #${attempts}`);
        const alts = await Promise.all(
          Array(routesCount).fill(null).map(()=>orsLeg(oCoords,dCoords,key))
        );
        for(const alt of alts){
          if(saved.length>=routesCount) break;
          const km=alt.distanceMeters/1000;
          if(Math.abs(km - (distanceKm ?? km))>maxDeltaKm) continue;
          const r=new Route({
            routeId:UUID.generate(),
            jobId:UUID.fromString(jobId),
            distanceKm:new DistanceKm(km),
            duration:new Duration(alt.durationSeconds),
            path:new Path(alt.encoded),
          });
          await repository.save(r);
          saved.push(r);
        }
      }

      else if(distanceKm!=null){
        console.info(`dist-only attempt #${attempts}`);
        let legData = null;


        if(roundTrip && circle){
          legData = await computeCircularORS(oCoords,distanceKm,8,key);
        }
  
        if(!legData){
          const bearing = Math.random()*360;
          const half = roundTrip ? distanceKm/2 : distanceKm!;
          const dest = offsetCoordinate(oCoords.lat,oCoords.lng,half,bearing);
          const out = await orsLeg(oCoords,dest,key);
          if(!out) continue;
          if(!roundTrip){
            legData = out;
          } else {
            const back = await orsLeg(dest,oCoords,key);
            const c1=new Path(out.encoded).Coordinates;
            const c2=new Path(back.encoded).Coordinates.slice(1);
            const poly = Path.fromCoordinates([...c1,...c2]).Encoded;
            legData = {
              distanceMeters:out.distanceMeters+back.distanceMeters,
              durationSeconds:out.durationSeconds+back.durationSeconds,
              encoded:poly
            };
          }
        }

        if(legData){
          const km = legData.distanceMeters/1000;
          if(Math.abs(km-distanceKm!)>maxDeltaKm) continue;
          const r=new Route({
            routeId:UUID.generate(),
            jobId:UUID.fromString(jobId),
            distanceKm:new DistanceKm(km),
            duration:new Duration(legData.durationSeconds),
            path:new Path(legData.encoded),
          });
          await repository.save(r);
          saved.push(r);
        }
      }
    }

    if(saved.length){
      console.info(`publishing ${saved.length} routes`);
      await publishRoutesGenerated(jobId,saved);
    } else {
      console.warn(`no routes after ${maxAtt} attempts`);
    }
  }
};
