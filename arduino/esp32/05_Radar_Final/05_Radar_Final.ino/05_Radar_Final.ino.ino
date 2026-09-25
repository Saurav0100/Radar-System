#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ==========================================
// Wi-Fi
// ==========================================

const char* WIFI_SSID = "the.old.calibre";
const char* WIFI_PASSWORD = "00001111";


// ==========================================
// MQTT
// ==========================================

const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

const char* COMMAND_TOPIC =
  "student/radar/command";

const char* DATA_TOPIC =
  "student/radar/data";

const char* STATUS_TOPIC =
  "student/radar/status";


// ==========================================
// Hardware
// ==========================================

const int SERVO_PIN = 18;
const int TRIG_PIN = 5;
const int ECHO_PIN = 17;


// ==========================================
// Radar settings
// ==========================================

const int MAX_DISTANCE = 200;
const int FILTER_READINGS = 3;

const unsigned long SCAN_INTERVAL = 50;

const unsigned long STATUS_INTERVAL = 5000;


// ==========================================
// Objects
// ==========================================

Servo radarServo;

WiFiClient espClient;
PubSubClient mqttClient(espClient);


// ==========================================
// Radar state
// ==========================================

bool scanning = false;
bool emergencyStop = false;

int currentAngle = 0;
int direction = 1;

unsigned long lastScanTime = 0;
unsigned long lastStatusTime = 0;


// ==========================================
// Wi-Fi
// ==========================================

void connectWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting to Wi-Fi");

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  while (
    WiFi.status() != WL_CONNECTED
  ) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected");

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}


// ==========================================
// MQTT
// ==========================================

void connectMQTT() {

  while (!mqttClient.connected()) {

    Serial.print(
      "Connecting to MQTT..."
    );

    String clientId = "ESP32-Radar-";
    clientId += String(
      random(0xffff),
      HEX
    );

    if (
      mqttClient.connect(
        clientId.c_str()
      )
    ) {

      Serial.println("connected");

      mqttClient.subscribe(
        COMMAND_TOPIC
      );

      mqttClient.publish(
        STATUS_TOPIC,
        "ONLINE"
      );

      Serial.println(
        "Subscribed to command topic"
      );

    } else {

      Serial.print(
        "MQTT failed, state="
      );

      Serial.println(
        mqttClient.state()
      );

      delay(2000);
    }
  }
}


// ==========================================
// Distance sensor
// ==========================================

float getDistance() {

  float total = 0;
  int validReadings = 0;

  for (
    int i = 0;
    i < FILTER_READINGS;
    i++
  ) {

    digitalWrite(
      TRIG_PIN,
      LOW
    );

    delayMicroseconds(2);

    digitalWrite(
      TRIG_PIN,
      HIGH
    );

    delayMicroseconds(10);

    digitalWrite(
      TRIG_PIN,
      LOW
    );

    long duration = pulseIn(
      ECHO_PIN,
      HIGH,
      30000
    );

    if (duration == 0) {
      continue;
    }

    float distance =
      duration * 0.0343 / 2.0;

    if (
      distance >= 2 &&
      distance <= MAX_DISTANCE
    ) {

      total += distance;
      validReadings++;
    }

    delay(3);
  }

  if (validReadings == 0) {
    return -1;
  }

  return (
    total / validReadings
  );
}


// ==========================================
// Send radar data
// ==========================================

void publishRadarData() {

  float distance = getDistance();

  if (distance < 0) {
    return;
  }

  char payload[100];

  snprintf(
    payload,
    sizeof(payload),
    "{\"angle\":%d,\"distance\":%.2f}",
    currentAngle,
    distance
  );

  mqttClient.publish(
    DATA_TOPIC,
    payload
  );

  Serial.print("Radar: ");
  Serial.print(currentAngle);

  Serial.print("° | ");

  Serial.print(distance);

  Serial.println(" cm");
}


// ==========================================
// MQTT command handler
// ==========================================

void callback(
  char* topic,
  byte* payload,
  unsigned int length
) {

  String message;

  for (
    unsigned int i = 0;
    i < length;
    i++
  ) {

    message += (
      char
    )payload[i];
  }

  message.trim();

  Serial.print(
    "Received command: "
  );

  Serial.println(
    message
  );


  // START

  if (message == "START") {

    emergencyStop = false;
    scanning = true;

    mqttClient.publish(
      STATUS_TOPIC,
      "SCANNING"
    );
  }


  // AUTO

  else if (message == "AUTO") {

    emergencyStop = false;
    scanning = true;

    mqttClient.publish(
      STATUS_TOPIC,
      "AUTO_MODE"
    );
  }


  // STOP

  else if (message == "STOP") {

    scanning = false;

    mqttClient.publish(
      STATUS_TOPIC,
      "STOPPED"
    );
  }


  // EMERGENCY STOP

  else if (
    message == "EMERGENCY_STOP"
  ) {

    scanning = false;
    emergencyStop = true;

    mqttClient.publish(
      STATUS_TOPIC,
      "EMERGENCY_STOP"
    );

    Serial.println(
      "EMERGENCY STOP"
    );
  }


  // MANUAL ANGLE

  else if (
    message.startsWith(
      "SET_ANGLE:"
    )
  ) {

    if (!emergencyStop) {

      int angle =
        message.substring(10).toInt();

      if (
        angle >= 0 &&
        angle <= 180
      ) {

        currentAngle = angle;

        scanning = false;

        radarServo.write(
          currentAngle
        );

        publishRadarData();

        mqttClient.publish(
          STATUS_TOPIC,
          "MANUAL_ANGLE"
        );

        Serial.print(
          "Moved to "
        );

        Serial.print(
          currentAngle
        );

        Serial.println("°");
      }
    }
  }
}


// ==========================================
// Radar scanning
// ==========================================

void scanRadar() {

  if (
    !scanning ||
    emergencyStop
  ) {
    return;
  }

  if (
    millis() - lastScanTime
    < SCAN_INTERVAL
  ) {
    return;
  }

  lastScanTime = millis();

  radarServo.write(
    currentAngle
  );

  publishRadarData();

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


// ==========================================
// Setup
// ==========================================

void setup() {

  Serial.begin(115200);

  // Servo

  radarServo.attach(
    SERVO_PIN
  );

  radarServo.write(0);


  // Ultrasonic

  pinMode(
    TRIG_PIN,
    OUTPUT
  );

  pinMode(
    ECHO_PIN,
    INPUT
  );


  // Wi-Fi

  connectWiFi();


  // MQTT

  mqttClient.setServer(
    MQTT_SERVER,
    MQTT_PORT
  );

  mqttClient.setCallback(
    callback
  );
}


// ==========================================
// Main loop
// ==========================================

void loop() {

  // Reconnect Wi-Fi if needed
  if (
    WiFi.status() != WL_CONNECTED
  ) {

    connectWiFi();
  }


  // Reconnect MQTT if needed

  if (
    !mqttClient.connected()
  ) {

    connectMQTT();
  }

  mqttClient.loop();


  // Scan

  scanRadar();


  // Periodic status

  if (
    millis() - lastStatusTime
    >= STATUS_INTERVAL
  ) {

    lastStatusTime = millis();

    mqttClient.publish(
      STATUS_TOPIC,
      emergencyStop
        ? "EMERGENCY_STOP"
        : (
          scanning
          ? "SCANNING"
          : "IDLE"
        )
    );
  }
}