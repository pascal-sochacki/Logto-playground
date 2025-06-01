package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

type LogtoTokenResponse struct {
	AccessToken     string `json:"access_token"`
	IssuedTokenType string `json:"issued_token_type"`
	TokenType       string `json:"token_type"`
	ExpiresIn       int    `json:"expires_in"`
	Scope           string `json:"scope,omitempty"`
}

var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Commands related to deployment processes and Logto integration",
	Long:  `Contains subcommands for deployment tasks, including interacting with Logto for token exchange.`,
}

var deployTestCmd = &cobra.Command{
	Use:   "test",
	Short: "Fetches and prints a Logto access token using a configured PAT",
	Long: `This command performs a token exchange with your Logto tenant.
It uses the Personal Access Token (PAT) and Logto client credentials
(client_id, client_secret, tenant_url) stored in the application's configuration file.

Required configuration values (typically in $HOME/.mycliapp.yaml):
  pat: "your_logto_personal_access_token" # Set using 'mycliapp pat add <TOKEN>'
  logto:
    tenant_url: "https://<your-tenant-id>.logto.app" # Your Logto tenant URL
    client_id: "your_logto_client_id"
    client_secret: "your_logto_client_secret"
    scope: "profile" # Optional: desired scopes, space-separated (e.g., "profile openid offline_access")
    resource: "urn:your-api-identifier" # Optional: API resource identifier if needed by your API (audience)

The command will then print the fetched access token to standard output.`,
	Run: func(cmd *cobra.Command, args []string) {
		// 1. Retrieve configuration from Viper
		pat := viper.GetString("pat")
		tenantURL := viper.GetString("logto.tenant_url")
		clientID := viper.GetString("logto.client_id")
		scope := viper.GetString("logto.scope")       // Optional
		resource := viper.GetString("logto.resource") // Optional

		// 2. Validate essential configuration
		if pat == "" {
			fmt.Fprintln(os.Stderr, "Error: Personal Access Token (pat) not found in configuration.")
			fmt.Fprintln(os.Stderr, "Please add it using 'mycliapp pat add <YOUR_LOGTO_PAT>' or by editing the config file.")
			os.Exit(1)
		}
		if tenantURL == "" || clientID == "" {
			fmt.Fprintln(os.Stderr, "Error: Logto configuration (logto.tenant_url, logto.client_id, logto.client_secret) is missing.")
			fmt.Fprintln(os.Stderr, "Please add these under the 'logto:' key in your configuration file.")
			os.Exit(1)
		}

		tokenEndpoint := strings.TrimSuffix(tenantURL, "/") + "/oidc/token"

		// 3. Prepare request body (application/x-www-form-urlencoded)
		data := url.Values{}
		data.Set("grant_type", "urn:ietf:params:oauth:grant-type:token-exchange")
		data.Set("subject_token", pat)
		data.Set("client_id", clientID)
		data.Set("subject_token_type", "urn:logto:token-type:personal_access_token")

		if scope != "" {
			data.Set("scope", scope)
		}
		if resource != "" {
			data.Set("resource", resource)
		}
		// Note: The Logto documentation example for token exchange with PAT using Basic Auth
		// does not include 'client_id' in the form body. It's part of the Basic Auth header.
		// If Logto requires it in the body as well, you would add: data.Set("client_id", clientID)

		reqBodyReader := strings.NewReader(data.Encode())

		// 4. Create HTTP client and request object
		httpClient := &http.Client{}
		req, err := http.NewRequest("POST", tokenEndpoint, reqBodyReader)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating HTTP request: %v\n", err)
			os.Exit(1)
		}

		// 5. Set necessary headers
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		// 6. Make the POST request
		fmt.Fprintln(os.Stderr, "Requesting access token from Logto at:", tokenEndpoint) // User feedback
		resp, err := httpClient.Do(req)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error making HTTP request to Logto: %v\n", err)
			os.Exit(1)
		}
		defer resp.Body.Close()

		respBodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading response body: %v\n", err)
			os.Exit(1)
		}

		// 7. Handle the response
		if resp.StatusCode != http.StatusOK {
			fmt.Fprintf(os.Stderr, "Error: Logto token exchange failed with status code %d\n", resp.StatusCode)
			fmt.Fprintf(os.Stderr, "Response from Logto: %s\n", string(respBodyBytes))
			os.Exit(1)
		}

		var tokenResponse LogtoTokenResponse
		if err := json.Unmarshal(respBodyBytes, &tokenResponse); err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing JSON response from Logto: %v\n", err)
			fmt.Fprintf(os.Stderr, "Raw response: %s\n", string(respBodyBytes))
			os.Exit(1)
		}

		// 8. Print the fetched access token
		fmt.Fprintln(os.Stdout, "Successfully obtained Logto access token:")
		fmt.Fprintln(os.Stdout, fmt.Sprintf("%+v", tokenResponse))
		// You can print other details from tokenResponse if needed:
		// fmt.Fprintf(os.Stdout, "\nToken Type: %s\nExpires In: %d seconds\nScope: %s\n",
		// 	tokenResponse.TokenType, tokenResponse.ExpiresIn, tokenResponse.Scope)
	},
}

// init function to register the commands
func init() {
	rootCmd.AddCommand(deployCmd)       // Add 'deploy' command to root
	deployCmd.AddCommand(deployTestCmd) // Add 'test' subcommand to 'deploy'

	// You could add flags here to override configuration values if needed, for example:
	// deployTestCmd.Flags().String("scope", "", "Override the scope for token exchange (from config: logto.scope)")
	// if err := viper.BindPFlag("logto.scope_override", deployTestCmd.Flags().Lookup("scope")); err != nil {
	// 	 fmt.Fprintf(os.Stderr, "Error binding scope flag: %v\n", err)
	// }
	// Then in Run, check viper.GetString("logto.scope_override")
}
