import cv2
import mediapipe as mp
import websocket
import time
from pathlib import Path


# ==========================
# Model
# ==========================

MODEL_PATH = str(
    Path(__file__).with_name("gesture_recognizer.task")
)


# ==========================
# MediaPipe
# ==========================

BaseOptions = mp.tasks.BaseOptions
GestureRecognizer = mp.tasks.vision.GestureRecognizer
GestureRecognizerOptions = mp.tasks.vision.GestureRecognizerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = GestureRecognizerOptions(
    base_options=BaseOptions(
        model_asset_path=MODEL_PATH
    ),
    running_mode=VisionRunningMode.IMAGE
)

recognizer = GestureRecognizer.create_from_options(options)


# ==========================
# WebSocket
# ==========================

ws = websocket.create_connection(
    "ws://localhost:5000"
)

print("Connected to Node.js")


# ==========================
# Gesture Commands
# ==========================

commands = {
    "Thumb_Up": "START",
    "Open_Palm": "STOP",
    "Closed_Fist": "EMERGENCY_STOP",
    "Victory": "AUTO",
    "Pointing_Up": "SET_ANGLE:90"
}


# ==========================
# Reliability Settings
# ==========================

CONFIDENCE_THRESHOLD = 0.50
REQUIRED_FRAMES = 5
COOLDOWN = 1.5

candidate_gesture = None
gesture_count = 0
last_sent_gesture = None
last_command_time = 0


# ==========================
# Camera
# ==========================

camera = cv2.VideoCapture(0)


while True:

    success, frame = camera.read()

    if not success:
        break

    frame = cv2.flip(frame, 1)

    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    result = recognizer.recognize(mp_image)

    gesture_name = "None"
    confidence = 0.0


    # ==========================
    # Detect Gesture
    # ==========================

    if result.gestures:

        gesture = result.gestures[0][0]

        gesture_name = gesture.category_name
        confidence = gesture.score


    # ==========================
    # Confidence Check
    # ==========================

    if (
        gesture_name in commands
        and confidence >= CONFIDENCE_THRESHOLD
    ):

        # Same gesture continues
        if gesture_name == candidate_gesture:

            gesture_count += 1

        else:

            candidate_gesture = gesture_name
            gesture_count = 1


        # ==========================
        # Stable Gesture Check
        # ==========================

        if gesture_count >= REQUIRED_FRAMES:

            current_time = time.time()

            # Cooldown check
            if (
                current_time - last_command_time
                >= COOLDOWN
            ):

                # Don't repeat same command
                if gesture_name != last_sent_gesture:

                    command = commands[gesture_name]

                    ws.send(command)

                    print(
                        f"Gesture: {gesture_name}"
                    )

                    print(
                        f"Confidence: {confidence:.2f}"
                    )

                    print(
                        f"Command: {command}"
                    )

                    last_sent_gesture = gesture_name
                    last_command_time = current_time

    else:

        # Reset when gesture is not reliable
        candidate_gesture = None
        gesture_count = 0
        last_sent_gesture = None


    # ==========================
    # Display
    # ==========================

    cv2.putText(
        frame,
        f"Gesture: {gesture_name}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (0, 255, 0),
        2
    )

    confidence_percent = confidence * 100

    cv2.putText(
        frame,
        f"Confidence: {confidence_percent:.1f}%",
        (20, 75),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2
    )

    cv2.imshow(
        "Gesture Control",
        frame
    )


    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


camera.release()
ws.close()
recognizer.close()
cv2.destroyAllWindows()