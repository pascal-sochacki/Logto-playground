interface PersonalAccessToken {
  tenantId: string;
  userId: string;
  name: string;
  value: string; // This is the actual token, typically only available on creation
  createdAt: number; // Epoch time in milliseconds
  expiresAt?: number | null; // Epoch time in milliseconds, or null if never expires
}

interface CreatePersonalAccessTokenRequest {
  name: string; // The personal access token name. Must be unique within the user.
  expiresAt?: number | null; // The epoch time in milliseconds when the token will expire. If not provided, the token will never expire.
}

interface CreatePersonalAccessTokenResponse extends PersonalAccessToken {
  // The 'value' field here will contain the newly created token.
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export class LogtoClient {
  private apiBaseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor(apiBaseUrl: string, clientId: string, clientSecret: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getAccessToken(
    resource: string, // e.g., `https://[tenant_id].logto.app/api`
    scope: string = "all",
  ): Promise<AccessTokenResponse> {
    try {
      const tokenEndpoint = `${this.apiBaseUrl}/oidc/token`;
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.clientId}:${this.clientSecret}`,
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          resource: resource,
          scope: scope,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        console.error(
          `Error fetching access token (${response.status}): ${errorData.message || "Unknown error"}`,
          errorData,
        );
        throw new Error(
          `Failed to fetch access token, status ${response.status}: ${errorData.message || "Unknown error"}`,
        );
      }

      const tokenResponse: AccessTokenResponse = await response.json();
      return tokenResponse;
    } catch (error) {
      console.error("Error in getAccessToken:", error);
      throw error;
    }
  }

  /**
   * Makes an authenticated API request.
   * @param endpoint The API endpoint (e.g., `/users/${userId}/personal-access-tokens`)
   * @param method HTTP method (GET, POST, DELETE, PATCH)
   * @param body Optional request body for POST/PATCH requests
   * @returns Promise<Response>
   */
  private async fetchFromLogtoAPI(
    endpoint: string,
    token: string,
    method: "GET" | "POST" | "DELETE" | "PATCH",
    body?: any,
  ): Promise<Response> {
    console.log(endpoint);
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error(
        `API Error (${response.status}) for ${method} ${endpoint}: ${errorData.message || "Unknown error"}`,
        errorData,
      );
      throw new Error(
        `API request failed with status ${response.status}: ${errorData.message || "Unknown error"}`,
      );
    }

    return response;
  }

  /**
   * Lists all personal access tokens for a given user.
   * @param userId The ID of the user.
   * @returns Promise<PersonalAccessToken[]>
   */
  async listPersonalAccessTokens(
    userId: string,
    token: string,
  ): Promise<PersonalAccessToken[]> {
    if (!userId) {
      throw new Error("User ID is required to list personal access tokens.");
    }
    console.log(`Fetching personal access tokens for user: ${userId}`);
    try {
      const response = await this.fetchFromLogtoAPI(
        `/api/users/${userId}/personal-access-tokens`,
        token,
        "GET",
      );
      const tokens: PersonalAccessToken[] = await response.json();
      return tokens;
    } catch (error) {
      console.error(
        `Error listing personal access tokens for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Creates a new personal access token for a user.
   * @param userId The ID of the user.
   * @param tokenDetails Details for the new token (name, expiresAt).
   * @returns Promise<CreatePersonalAccessTokenResponse> The created token, including its value.
   */
  async createPersonalAccessToken(
    userId: string,
    tokenDetails: CreatePersonalAccessTokenRequest,
    token: string,
  ): Promise<CreatePersonalAccessTokenResponse> {
    if (!userId || !tokenDetails || !tokenDetails.name) {
      throw new Error(
        "User ID and token name are required to create a personal access token.",
      );
    }
    console.log(
      `Creating personal access token for user ${userId} with name: ${tokenDetails.name}`,
    );
    try {
      const response = await this.fetchFromLogtoAPI(
        `/api/users/${userId}/personal-access-tokens`,
        token,
        "POST",
        tokenDetails,
      );
      // Status code for successful creation is 201
      if (response.status !== 201) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          `API request failed to create token, status ${response.status}: ${errorData.message || "Unknown error"}`,
        );
      }
      const newToken: CreatePersonalAccessTokenResponse = await response.json();
      return newToken;
    } catch (error) {
      console.error(
        `Error creating personal access token for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deletes a personal access token by its name for a given user.
   * @param userId The ID of the user.
   * @param tokenName The name of the token to delete.
   * @returns Promise<void>
   */
  async deletePersonalAccessToken(
    userId: string,
    tokenName: string,
    token: string,
  ): Promise<void> {
    if (!userId || !tokenName) {
      throw new Error(
        "User ID and token name are required to delete a personal access token.",
      );
    }
    console.log(
      `Deleting personal access token with name "${tokenName}" for user: ${userId}`,
    );
    try {
      const response = await this.fetchFromLogtoAPI(
        `/api/users/${userId}/personal-access-tokens/${encodeURIComponent(tokenName)}`,
        token,
        "DELETE",
      );
      // Successful deletion returns a 204 No Content
      if (response.status !== 204) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          `API request failed to delete token, status ${response.status}: ${errorData.message || "Unknown error"}`,
        );
      }
      console.log(`Successfully deleted token: ${tokenName}`);
    } catch (error) {
      console.error(
        `Error deleting personal access token "${tokenName}" for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
