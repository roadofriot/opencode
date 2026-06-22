export type QueryClass = "casual" | "simple" | "complex"

export type ClassificationResult = {
  class: QueryClass
  confidence: number
}
