"""YOLO vehicle detection wrapper for single frames and batches."""

from ultralytics import YOLO
from src.logger import logger


class VehicleDetector:
    """Detects vehicles in a frame using a YOLO model.
    """

    def __init__(self, model_path: str, confidence: float, classes: list, imgsz: int = 640):
        """Initialize the detector.

        Args:
            model_path (str): Path to the YOLO weights file.
            confidence (float): Minimum confidence threshold for detections.
            classes (list): List of class IDs to detect (e.g., [2, 5, 7] for car, bus, truck).
            imgsz (int, optional): Inference image size. Defaults to 640.
        """
        self.model = YOLO(model_path)
        self.confidence = confidence
        self.classes = classes
        self.imgsz = imgsz

    def detect(self, frame) -> list[dict]:
        """Run inference on a single frame to detect vehicles.

        Args:
            frame: OpenCV image frame.

        Returns:
            list[dict]: List of detection dictionaries containing 'bbox', 'confidence', 'class_id', and 'class_name'.
        """
        # Run YOLO inference with verbose disabled to keep console clean
        results = self.model(
            frame,
            conf=self.confidence,
            classes=self.classes,
            imgsz=self.imgsz,
            verbose=False,
        )[0]

        # Extract and format YOLO detection results
        detections = []
        for box in results.boxes:
            # Get integer coordinates for bounding box
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            
            # Map class ID to human-readable name using model's internal dictionary
            class_id = int(box.cls[0])
            class_name = self.model.names.get(class_id, "unknown")
            conf = float(box.conf[0])

            logger.debug(f"Detected {class_name} ({conf:.2f}) at [{x1}, {y1}, {x2}, {y2}]")

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": conf,
                "class_id": class_id,
                "class_name": class_name,
            })

        return detections

    def detect_batch(self, patches: list, imgsz: int = None) -> list[list[dict]]:
        """Run a single inference call on a list of image patches.

        Args:
            patches (list): List of OpenCV image patches (e.g. one per slot).
            imgsz (int, optional): Inference size for this batch. Defaults to
                the detector's configured imgsz. Use a small value for small
                patches to keep latency low.

        Returns:
            list[list[dict]]: Per-patch detection lists, in the same order as
                the input patches.
        """
        if not patches:
            return []

        # One forward pass over the whole batch; ultralytics preserves order
        results = self.model(
            patches,
            conf=self.confidence,
            classes=self.classes,
            imgsz=imgsz or self.imgsz,
            verbose=False,
        )

        batch = []
        for res in results:
            detections = []
            for box in res.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                class_id = int(box.cls[0])
                class_name = self.model.names.get(class_id, "unknown")
                conf = float(box.conf[0])
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "class_id": class_id,
                    "class_name": class_name,
                })
            batch.append(detections)

        return batch
