#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

const char* COMMAND_TOPIC =
  "student/radar/command";

const char* STATUS_TOPIC =
  "student/radar/status";

const int SERVO_PIN = 18;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

Servo radarServo;

bool scanning = false;
bool emergencyStop = false;

int currentAngle = 0;
int direction = 1;

void connectWiFi() {

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected");
}

void connectMQTT() {

  while (!mqttClient.connected()) {

    Serial.print("Connecting to MQTT...");

    String clientId = "ESP32-Radar-Test-";
    clientId += String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {

      Serial.println("connected");

      mqttClient.subscribe(
        COMMAND_TOPIC
      );

      mqttClient.publish(
        STATUS_TOPIC,
        "ONLINE"
      );

    } else {

      Serial.print("Failed, state=");
      Serial.println(mqttClient.state());

      delay(2000);
    }
  }
}

void callback(
  char* topic,
  byte* payload,
  unsigned int length
) {

  String message;

  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Received: ");
  Serial.println(message);

  if (message == "START") {

    emergencyStop = false;
    scanning = true;

    mqttClient.publish(
      STATUS_TOPIC,
      "SCANNING"
    );
  }

  else if (message == "AUTO") {

    emergencyStop = false;
    scanning = true;

    mqttClient.publish(
      STATUS_TOPIC,
      "AUTO_MODE"
    );
  }

  else if (message == "STOP") {

    scanning = false;

    mqttClient.publish(
      STATUS_TOPIC,
      "STOPPED"
    );
  }

  else if (message == "EMERGENCY_STOP") {

    scanning = false;
    emergencyStop = true;

    mqttClient.publish(
      STATUS_TOPIC,
      "EMERGENCY_STOP"
    );

    Serial.println(
      "EMERGENCY STOP!"
    );
  }

  else if (
    message.startsWith("SET_ANGLE:")
  ) {

    if (!emergencyStop) {

      int angle =
        message.substring(10).toInt();

      if (angle >= 0 && angle <= 180) {

        currentAngle = angle;
        scanning = false;

        radarServo.write(
          currentAngle
        );

        Serial.print(
          "Servo angle: "
        );

        Serial.println(
          currentAngle
        );

        mqttClient.publish(
          STATUS_TOPIC,
          "MANUAL_ANGLE"
        );
      }
    }
  }
}

void scanRadar() {

  if (!scanning || emergencyStop) {
    return;
  }

  radarServo.write(
    currentAngle
  );

  delay(30);

  currentAngle += direction;

  if (currentAngle >= 180) {
    currentAngle = 180;
    direction = -1;
  }

  if (currentAngle <= 0) {
    currentAngle = 0;
    direction = 1;
  }
}

void setup() {

  Serial.begin(115200);

  radarServo.attach(SERVO_PIN);
  radarServo.write(0);

  connectWiFi();

  mqttClient.setServer(
    MQTT_SERVER,
    MQTT_PORT
  );

  mqttClient.setCallback(
    callback
  );
}

void loop() {

  if (!mqttClient.connected()) {
    connectMQTT();
  }

  mqttClient.loop();

  scanRadar();
}