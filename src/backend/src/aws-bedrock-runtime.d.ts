declare module "@aws-sdk/client-bedrock-runtime" {
  export class BedrockRuntimeClient {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }
  export class InvokeModelCommand {
    constructor(args: any);
  }
}
