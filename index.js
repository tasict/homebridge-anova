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

function sendCommand(url, body){

	const response = await fetch(
	  url,
	  (
	    body ? [{
	      method: 'POST',
	      headers: { 'Content-Type': 'application/json' },
	      body: JSON.stringify(body),
	    }] : []
	  ),
	);

	return response.json();
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
	getStatus: function(){

		var response = sendCommand(COOKER_ENDPOINT(this.cooker, this.secret));

		this.log("response", response);

		return response;
	},
	// Required
	getCurrentHeatingCoolingState: function(callback) {

		var response = this.getStatus();

		if (!err && response.status == 200) {
			this.currentHeatingCoolingState = response.is_running ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
			this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, this.currentHeatingCoolingState);
				
			callback(null, this.currentHeatingCoolingState); // success
		} else {
			
			this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.OFF);
			callback(null, this.currentHeatingCoolingState); // success
		}
	},
	getTargetHeatingCoolingState: function(callback) {

		callback(null, this.targetHeatingCoolingState); // success
	},
	setTargetHeatingCoolingState: function(value, callback) {

		callback(null); // success
	},
	getCurrentTemperature: function(callback) {
		
		callback(null, this.currentTemperature); // success
	},
	getTargetTemperature: function(callback) {
		callback(null, this.targetTemperature); // success
	},
	setTargetTemperature: function(value, callback) {
		callback(null); // success
	},
	getTemperatureDisplayUnits: function(callback) {
		callback(error, this.temperatureDisplayUnits);
	},
	setTemperatureDisplayUnits: function(value, callback) {
		callback(null); // success
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
