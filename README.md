# sendeo

`POST /routes` enqueues a job to generate walking routes using the Google Maps
Directions API. The body can include:

```json
{
  "origin": "Address",
  "destination": "Address",
  "distanceKm": 5,
  "routesCount": 3
}
```

If `routesCount` is omitted the worker now defaults to generating **three**
routes instead of one.
