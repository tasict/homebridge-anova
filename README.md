# homebridge-anova

Supports anova cooker devices on HomeBridge Platform

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-anova
3. Update your configuration file. See bellow for a sample. 

# Configuration

Configuration sample:

 ```
    {
        "bridge": {
            ...
        },
        
        "description": "...",

        "accessories": [
            {
                "accessory": "AnovaCooker",
                "name": "SousVide",
                "cooker": "ID",
                "secret": "secret"
            }
        ],

        "platforms":[]
    }



