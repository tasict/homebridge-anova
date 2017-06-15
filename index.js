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

function AnovaCooker(log, config) {

	this.log = log;
	//Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
	//Characteristic.TemperatureDisplayUnits.FAHRENHEIT = 1;
	this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
	this.maxTemp = this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 99 : 210;
	this.minTemp = this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 25 : 77;
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
	getName: function(callback) {
		this.log("getName :", this.name);
		var error = null;
		callback(error, this.name);
	},
	getServices: function() {

		function getCurrentHeatingCoolingState(json) {

			return json.is_running ? Characteristic.TargetHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;

		}

		function getTargetHeatingCoolingState(json) {

			return json.is_running ? Characteristic.TargetHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
		}


		function getCurrentTemperature(json) {
			
			return json.current_temp ? json.current_temp :  this.minTemp;
		}

		function getTargetTemperature(json) {
			return json.target_temp ? json.target_temp :  this.minTemp;
		}

		
		function getTemperatureDisplayUnits(json) {

			var unit = json.temp_unit == 'c' ? Characteristic.TemperatureDisplayUnits.CELSIUS : Characteristic.TemperatureDisplayUnits.FAHRENHEIT;

			this.temperatureDisplayUnits = unit;
			this.maxTemp = this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 99 : 210;
			this.minTemp = this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 25 : 77;

			var characteristicCurrentTemperature = this.service.getCharacteristic(Characteristic.CurrentTemperature);

			if(characteristicCurrentTemperature){
				characteristicCurrentTemperature.setProps({
				    maxValue: this.maxTemp,
				    minValue: this.minTemp
				});
			}

			var characteristicTargetTemperature = this.service.getCharacteristic(Characteristic.TargetTemperature);

			if(characteristicTargetTemperature){
				characteristicTargetTemperature.setProps({
				    maxValue: this.maxTemp,
				    minValue: this.minTemp
				});
			}


			return unit;
		}

		function setTargetHeatingCoolingState(value) {

			if(value == Characteristic.TargetHeatingCoolingState.COOL || value == Characteristic.TargetHeatingCoolingState.OFF ){
				return "{ is_running: false }";
			}

			return "{ is_running: true }";
		}

		function setTargetTemperature(value) {
			return "{ target_temp: ${value} }";
		}

		function setTemperatureDisplayUnits(value) {
			return value == Characteristic.TemperatureDisplayUnits.CELSIUS ? "{ temp_unit: 'c' }" : "{ temp_unit: 'f' }";
		}
		
		var getDispatch = function (callback, characteristic){
			var value = 0;
			var actionName = "get" + characteristic.displayName.replace(/\s/g, '');
			
			request.get({ url: COOKER_ENDPOINT(this.cooker, this.secret)}, function (err, response, body) {

				
				if (!err && response.statusCode == 200) {
					this.log("getDispatch:returnedvalue: ", JSON.parse(body).value);
					
					var json = JSON.parse(body);

					switch (actionName) {
						case "getCurrentHeatingCoolingState": value = getCurrentHeatingCoolingState(json); break;
						case "getTargetHeatingCoolingState": value = getTargetHeatingCoolingState(json); break;
						case "getCurrentTemperature": value = getCurrentTemperature(json); break;
						case "getTargetTemperature": value = getTargetTemperature(json); break;
						case "getTemperatureDisplayUnits": value = getTemperatureDisplayUnits(json); break;
						default: value = 0;
					}
				}
				else
				{
					switch (actionName) {
						case "getCurrentHeatingCoolingState": value = Characteristic.CurrentHeatingCoolingState.OFF; break;
						case "getTargetHeatingCoolingState": value = Characteristic.TargetHeatingCoolingState.OFF; break;
						case "getCurrentTemperature": value = this.minTemp; break;
						case "getTargetTemperature": value = this.minTemp; break;
						case "getTemperatureDisplayUnits": value = this.temperatureDisplayUnits; break;
						default: value = 0;
					}
				}

				this.log("getDispatch: " + actionName + ":", value);

				callback(null, value);

			}.bind(this));

		}.bind(this);

		var setDispatch = function (value, callback, characteristic) {

			var actionName = "set" + characteristic.displayName.replace(/\s/g, '');
			this.log("setDispatch: " + actionName + ":", value);

			var body = [];

			switch (actionName) {
				case "setTargetHeatingCoolingState": body = setTargetHeatingCoolingState(value); break;
				case "setTargetTemperature": body = setTargetTemperature(value); break;
				case "setTemperatureDisplayUnits": body = setTemperatureDisplayUnits(value); break;
				default:
			}
			
			request.post({ 
				url: COOKER_ENDPOINT(this.cooker, this.secret), 
				headers: { 'Content-Type': 'application/json' },
	        	body: JSON.stringify(body)
	        }, function (err, response, body) {
				
				callback(null, value);

			}.bind(this));

		}.bind(this);

		function makeHelper(characteristic) {

			return {
				getter: function (callback) { getDispatch(callback, characteristic); },
				setter: function (value, callback) { setDispatch(value, callback, characteristic) }
			};
		}


		// you can OPTIONALLY create an information service if you wish to override
		// the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Anovaculinary.com")
			.setCharacteristic(Characteristic.Model, "Anova Precision Cooker")
			.setCharacteristic(Characteristic.SerialNumber, this.cooker);


		var counters = [];

		//this.service.addCharacteristic(Characteristic.LockManagementAutoSecurityTimeout);

		// Bind Characteristics
		for (var characteristicIndex in this.service.characteristics) 
		{
			var characteristic = this.service.characteristics[characteristicIndex];
			var compactName = characteristic.displayName.replace(/\s/g, '');

			if(compactName == 'Name'){
				continue;
			}

			this.log("makeHelper: ", compactName);

			counters[characteristicIndex] = makeHelper(characteristic);
			characteristic.on('get', counters[characteristicIndex].getter.bind(this))
			characteristic.on('set', counters[characteristicIndex].setter.bind(this));
		}


		return [informationService, this.service];
	}
};
