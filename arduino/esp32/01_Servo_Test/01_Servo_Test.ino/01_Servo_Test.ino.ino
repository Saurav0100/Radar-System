#include <ESP32Servo.h>

Servo radarServo;

const int SERVO_PIN = 18;
const int TRIG_PIN = 5;
const int ECHO_PIN = 17;

const int MAX_DISTANCE = 200;

float getDistance() {

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(
    ECHO_PIN,
    HIGH,
    30000
  );

  if (duration == 0) {
    return -1;
  }

  float distance =
    duration * 0.0343 / 2.0;

  if (
    distance < 2 ||
    distance > MAX_DISTANCE
  ) {
    return -1;
  }

  return distance;
}

void setup() {

  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  radarServo.attach(SERVO_PIN);
  radarServo.write(0);

  Serial.println("Radar hardware test started");
}

void loop() {

  for (int angle = 0; angle <= 180; angle++) {

    radarServo.write(angle);

    delay(40);

    float distance = getDistance();

    Serial.print("Angle: ");
    Serial.print(angle);
    Serial.print("° | Distance: ");

    if (distance < 0) {
      Serial.println("No valid reading");
    } else {
      Serial.print(distance);
      Serial.println(" cm");
    }
  }

  for (int angle = 180; angle >= 0; angle--) {

    radarServo.write(angle);

    delay(40);

    float distance = getDistance();

    Serial.print("Angle: ");
    Serial.print(angle);
    Serial.print("° | Distance: ");

    if (distance < 0) {
      Serial.println("No valid reading");
    } else {
      Serial.print(distance);
      Serial.println(" cm");
    }
  }
}