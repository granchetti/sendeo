export type Stage = "test" | "dev" | "prod";
export interface WithStage {
  stage: Stage;
}
