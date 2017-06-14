var Service, Characteristic;
var request = require("request");

const COOKER_ENDPOINT = (id, secretKey) => (
  `https://api.anovaculinary.com/cookers/${encodeURIComponent(id)}?secret=${secretKey}&requestKey=${new Date().valueOf()}`
);

const JOBS_ENDPOINT = (id, secretKey) => (
  `https://api.anovaculinary.com/cookers/${encodeURIComponent(id)}/jobs?secret=${secretKey}&requestKey=${new Date().valueOf()}`
); 


module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-anova", "AnovaCooker", AnovaCooker);
};

function sendCommand(command, body){



};

function AnovaCooker(log, config) {

	this.log = log;
	//Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
	//Characteristic.TemperatureDisplayUnits.FAHRENHEIT = 1;
	this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
	this.maxTemp = this.TemperatureDisplayUnits == 0 ? 99 : 210;
	this.minTemp = this.TemperatureDisplayUnits == 0 ? 25 : 77;
	this.name = config.name;
	this.cooker = config.cooker || null;
	this.secret = config.secret || null;

	this.currentTemperature = this.minTemp;
	// The value property of CurrentHeatingCoolingState must be one of the following:
	//Characteristic.CurrentHeatingCoolingState.OFF = 0;
	//Characteristic.CurrentHeatingCoolingState.HEAT = 1;
	//Characteristic.CurrentHeatingCoolingState.COOL = 2;
	this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
	this.targetTemperature = this.minTemp;
	// The value property of TargetHeatingCoolingState must be one of the following:
	//Characteristic.TargetHeatingCoolingState.OFF = 0;
	//Characteristic.TargetHeatingCoolingState.HEAT = 1;
	//Characteristic.TargetHeatingCoolingState.COOL = 2;
	//Characteristic.TargetHeatingCoolingState.AUTO = 3;
	this.targetHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

	this.service = new Service.Thermostat(this.name);

}

AnovaCooker.prototype = {
	//Start
	identify: function(callback) {
		this.log("Identify requested!");
		callback(null);
	},
	// Required
	getCurrentHeatingCoolingState: function(callback) {
		var rest = COOKER_ENDPOINT(this.cooker, this.secret);
		this.log("getCurrentHeatingCoolingState from:", rest);
		request.get({
			url: rest
		}, function(err, response, body) {

			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"targetTemperature":10,"temperature":12,"humidity":98}
				this.log("currentHeatingCoolingState is %s", json.currentHeatingCoolingState);
				this.currentHeatingCoolingState = json.currentHeatingCoolingState;
				this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, this.currentHeatingCoolingState);
				
				callback(null, this.currentHeatingCoolingState); // success
			} else {
				this.log("Error getting CurrentHeatingCoolingState: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getTargetHeatingCoolingState: function(callback) {
		var rest = COOKER_ENDPOINT(this.cooker, this.secret);
		this.log("getTargetHeatingCoolingState from:", rest);
		request.get({
			url: rest
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{"targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"targetTemperature":10,"temperature":12,"humidity":98}
				this.log("TargetHeatingCoolingState received is %s", json.targetHeatingCoolingState, json.targetStateCode);
				this.targetHeatingCoolingState = json.targetHeatingCoolingState !== undefined? json.targetHeatingCoolingState : json.targetStateCode;
				this.log("TargetHeatingCoolingState is now %s", this.targetHeatingCoolingState);
				//this.service.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.targetHeatingCoolingState);
				
				callback(null, this.targetHeatingCoolingState); // success
			} else {
				this.log("Error getting TargetHeatingCoolingState: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	setTargetHeatingCoolingState: function(value, callback) {

		var rest = COOKER_ENDPOINT(this.cooker, this.secret);

		if(value === undefined) {
			callback(); //Some stuff call this without value doing shit with the rest
		} else {
			this.log("setTargetHeatingCoolingState from/to:", rest + value);
			
			request.get({
				url: rest
			}, function(err, response, body) {
				if (!err && response.statusCode == 200) {
					this.log("response success");
					this.targetHeatingCoolingState = value;
					callback(null); // success
				} else {
					this.log("Error getting state: %s", err);
					callback(err);
				}
			}.bind(this));
		}
	},
	getCurrentTemperature: function(callback) {
		var rest = COOKER_ENDPOINT(this.cooker, this.secret);
		this.log("getCurrentTemperature from:", rest);
		request.get({
			url: rest
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0,"temperature":"18.10","humidity":"34.10"}

				if (json.currentTemperature != undefined)
                                {
                                  this.log("CurrentTemperature %s", json.currentTemperature);
                                  this.currentTemperature = parseFloat(json.currentTemperature);
                                }
                                else
                                {
                                  this.log("Temperature %s", json.temperature);
                                  this.currentTemperature = parseFloat(json.temperature);
                                }
								
				callback(null, this.currentTemperature); // success
			} else {
				this.log("Error getting state: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getTargetTemperature: function(callback) {
		var rest = COOKER_ENDPOINT(this.cooker, this.secret);
		this.log("getTargetTemperature from:", rest);
		request.get({
			url: rest
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				var json = JSON.parse(body); //{targetHeatingCoolingState":3,"currentHeatingCoolingState":0"temperature":"18.10","humidity":"34.10"}
				this.targetTemperature = parseFloat(json.targetTemperature);
				this.log("Target temperature is %s", this.targetTemperature);
				callback(null, this.targetTemperature); // success
			} else {
				this.log("Error getting state: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	setTargetTemperature: function(value, callback) {
		var rest = COOKER_ENDPOINT(this.cooker, this.secret);
		this.log("setTargetTemperature from:", rest+value);
		request.get({
			url: rest
		}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				this.log("response success");
				callback(null); // success
			} else {
				this.log("Error getting state: %s", err);
				callback(err);
			}
		}.bind(this));
	},
	getTemperatureDisplayUnits: function(callback) {
		this.log("getTemperatureDisplayUnits:", this.temperatureDisplayUnits);
		var error = null;
		callback(error, this.temperatureDisplayUnits);
	},
	setTemperatureDisplayUnits: function(value, callback) {
		this.log("setTemperatureDisplayUnits from %s to %s", this.temperatureDisplayUnits, value);
		this.temperatureDisplayUnits = value;
		var error = null;
		callback(error);
	},
	getName: function(callback) {
		this.log("getName :", this.name);
		var error = null;
		callback(error, this.name);
	},

	getServices: function() {

		// you can OPTIONALLY create an information service if you wish to override
		// the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Anovaculinary.com")
			.setCharacteristic(Characteristic.Model, "Anova Precision Cooker")
			.setCharacteristic(Characteristic.SerialNumber, this.cooker);

		
		// Required Characteristics
		this.service
			.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
			.on('get', this.getCurrentHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', this.getTargetHeatingCoolingState.bind(this))
			.on('set', this.setTargetHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));

		this.service
			.getCharacteristic(Characteristic.TargetTemperature)
			.on('get', this.getTargetTemperature.bind(this))
			.on('set', this.setTargetTemperature.bind(this));

		this.service
			.getCharacteristic(Characteristic.TemperatureDisplayUnits)
			.on('get', this.getTemperatureDisplayUnits.bind(this))
			.on('set', this.setTemperatureDisplayUnits.bind(this));

		this.service
			.getCharacteristic(Characteristic.Name)
			.on('get', this.getName.bind(this));

		this.service.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minValue: this.minTemp,
				maxValue: this.maxTemp,
				minStep: 1
			});

		this.service.getCharacteristic(Characteristic.TargetTemperature)
			.setProps({
				minValue: this.minTemp,
				maxValue: this.maxTemp,
				minStep: 1
			});

		return [informationService, this.service];
	}
};
