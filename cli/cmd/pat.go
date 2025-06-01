package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var patCmd = &cobra.Command{
	Use:   "pat",
	Short: "Manage Personal Access Tokens (PAT)",
	Long:  `Provides subcommands to manage Personal Access Tokens (PATs) stored in the application configuration.`,
}

var addPatCmd = &cobra.Command{
	Use:   "add [token]",
	Short: "Add or update your Personal Access Token (PAT)",
	Long: `Adds or updates your Personal Access Token (PAT) in the configuration file.
The token will be stored under the key 'pat'.
If a configuration file does not exist at the specified or default location, it will be created.`,
	Args: cobra.ExactArgs(1),
	Run: func(command *cobra.Command, args []string) {
		patValue := args[0]
		if patValue == "" {
			fmt.Fprintln(os.Stderr, "Error: PAT value cannot be empty.")
			os.Exit(1)
		}

		viper.Set("pat", patValue)

		determinedConfigFile, err := GetConfigFilePath()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error determining config file path: %v\n", err)
			os.Exit(1)
		}

		configDir := filepath.Dir(determinedConfigFile)
		if _, err := os.Stat(configDir); os.IsNotExist(err) {
			if err := os.MkdirAll(configDir, 0755); err != nil {
				fmt.Fprintf(os.Stderr, "Error creating config directory %s: %v\n", configDir, err)
				os.Exit(1)
			}
		}

		if err := viper.WriteConfigAs(determinedConfigFile); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing configuration to %s: %v\n", determinedConfigFile, err)
			os.Exit(1)
		}

		fmt.Printf("PAT successfully set in %s\n", determinedConfigFile)
		fmt.Printf("The key 'pat' now holds your token.\n")
	},
}

func init() {
	patCmd.AddCommand(addPatCmd)
	rootCmd.AddCommand(patCmd)
}
