package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/pascal-sochacki/logto-playground/internal/config"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const (
	defaultConfigFileName = ".logto-playground"
	defaultConfigType     = "yaml"
)

var cfgFile string

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}

		viper.AddConfigPath(home)
		viper.SetConfigName(defaultConfigFileName)
		viper.SetConfigType(defaultConfigType)
	}

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
		} else {
			fmt.Fprintf(os.Stderr, "Error reading config file (%s): %v\n", viper.ConfigFileUsed(), err)
		}
	}
	if err := config.LoadConfig(); err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "logto-playground",
	Short: "A brief description of your application",
	Long: `A longer description that spans multiple lines and likely contains
examples and usage of using your application. For example:

Cobra is a CLI library for Go that empowers applications.
This application is a tool to generate the needed files
to quickly create a Cobra application.`,
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func GetConfigFilePath() (string, error) {
	if cfgFile != "" {
		return cfgFile, nil
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get user home directory: %w", err)
	}
	return filepath.Join(home, defaultConfigFileName+"."+defaultConfigType), nil
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", fmt.Sprintf("config file (default is $HOME/%s.%s)", defaultConfigFileName, defaultConfigType))
	rootCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")

}
