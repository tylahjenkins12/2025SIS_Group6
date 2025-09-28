export interface ConnectionTestResult {
  endpoint: string;
  status: "success" | "error" | "pending";
  responseTime?: number;
  statusCode?: number;
  error?: string;
  data?: any;
}

export class BackendTester {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8080";
  }

  async testEndpoint(path: string, options: RequestInit = {}): Promise<ConnectionTestResult> {
    const endpoint = `${this.baseUrl}${path}`;
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const responseTime = Date.now() - startTime;

      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      return {
        endpoint,
        status: response.ok ? "success" : "error",
        responseTime,
        statusCode: response.status,
        data,
      };
    } catch (error) {
      return {
        endpoint,
        status: "error",
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async testHealthCheck(): Promise<ConnectionTestResult> {
    return this.testEndpoint("/");
  }

  async testSessionCreation(sessionData: {
    lecturer_name: string;
    course_name: string;
    question_interval_seconds: number;
    answer_time_seconds: number;
    transcription_interval_seconds: number;
  }): Promise<ConnectionTestResult> {
    return this.testEndpoint("/start-session", {
      method: "POST",
      body: JSON.stringify(sessionData),
    });
  }

  async testAllEndpoints(): Promise<ConnectionTestResult[]> {
    const results: ConnectionTestResult[] = [];

    // Test health check
    results.push(await this.testHealthCheck());

    // Test session creation
    results.push(await this.testSessionCreation({
      lecturer_name: "Test Lecturer",
      course_name: "Test Course",
      question_interval_seconds: 30,
      answer_time_seconds: 30,
      transcription_interval_seconds: 10,
    }));

    return results;
  }

  getWebSocketUrl(sessionId: string, clientType: "lecturer" | "student"): string {
    const wsBase = process.env.NEXT_PUBLIC_BACKEND_WS_BASE || "ws://localhost:8080";
    return `${wsBase}/ws/${clientType}/${sessionId}`;
  }
}

export const backendTester = new BackendTester();