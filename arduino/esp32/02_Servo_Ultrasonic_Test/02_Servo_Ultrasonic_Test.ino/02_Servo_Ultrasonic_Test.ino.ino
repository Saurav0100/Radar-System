#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

const char* TEST_TOPIC = "student/radar/test";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void connectWiFi() {

  Serial.print("Connecting to Wi-Fi");

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected");

  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {

  while (!mqttClient.connected()) {

    Serial.print("Connecting to MQTT...");

    String clientId = "ESP32-Test-";
    clientId += String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {

      Serial.println("connected");

      mqttClient.publish(
        TEST_TOPIC,
        "ESP32_ONLINE"
      );

    } else {

      Serial.print("failed, state=");
      Serial.println(mqttClient.state());

      delay(2000);
    }
  }
}

void setup() {

  Serial.begin(115200);

  connectWiFi();

  mqttClient.setServer(
    MQTT_SERVER,
    MQTT_PORT
  );
}

void loop() {

  if (!mqttClient.connected()) {
    connectMQTT();
  }

  mqttClient.loop();

  static unsigned long lastPublish = 0;

  if (millis() - lastPublish >= 5000) {

    lastPublish = millis();

    mqttClient.publish(
      TEST_TOPIC,
      "ESP32_TEST_MESSAGE"
    );

    Serial.println(
      "Published test message"
    );
  }
}