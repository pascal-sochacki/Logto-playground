package config

import "github.com/spf13/viper"

type Config struct {
}

var Cfg Config

func LoadConfig() error {
	if err := viper.Unmarshal(&Cfg); err != nil {
		return err
	}
	return nil
}
