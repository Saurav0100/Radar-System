import cv2
import mediapipe as mp
import websocket
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

GestureRecognizer = (
    mp.tasks.vision.GestureRecognizer
)

GestureRecognizerOptions = (
    mp.tasks.vision.GestureRecognizerOptions
)

VisionRunningMode = (
    mp.tasks.vision.RunningMode
)


options = GestureRecognizerOptions(
    base_options=BaseOptions(
        model_asset_path=MODEL_PATH
    ),
    running_mode=VisionRunningMode.IMAGE
)

recognizer = (
    GestureRecognizer.create_from_options(options)
)


# ==========================
# WebSocket
# ==========================

ws = websocket.create_connection(
    "ws://localhost:5000"
)

print("Connected to Node.js")


# ==========================
# Gesture → Command
# ==========================

commands = {
    "Thumb_Up": "START",
    "Open_Palm": "STOP",
    "Closed_Fist": "EMERGENCY_STOP",
    "Victory": "AUTO",
    "Pointing_Up": "SET_ANGLE:90"
}


# ==========================
# Camera
# ==========================

camera = cv2.VideoCapture(0)

last_gesture = None


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


    if result.gestures:

        gesture = result.gestures[0][0]

        gesture_name = gesture.category_name
        confidence = gesture.score


        # Send only when gesture changes
        if (
            gesture_name != last_gesture
            and gesture_name in commands
        ):

            command = commands[gesture_name]

            ws.send(command)

            print(
                f"Gesture: {gesture_name}"
            )

            print(
                f"Command: {command}"
            )

            last_gesture = gesture_name


    # ==========================
    # Show on camera
    # ==========================

    cv2.putText(
        frame,
        f"Gesture: {gesture_name}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    cv2.putText(
        frame,
        f"Confidence: {confidence:.2f}",
        (20, 80),
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