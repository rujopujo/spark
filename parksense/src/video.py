"""Video capture helpers: open, seek, and resolve display size."""

import os

import cv2


def ensure_parent_dir(path: str) -> str:
    """Create the directory a file is about to be written into.

    OpenCV's writers fail silently when the parent directory is missing, so
    every output path goes through here first.

    Args:
        path (str): Path of the file about to be written.

    Returns:
        str: The same path, unchanged.
    """
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)
    return path


def open_video(path: str) -> cv2.VideoCapture:
    """Open a video file and return the VideoCapture object.

    Args:
        path (str): Path to the video file.

    Returns:
        cv2.VideoCapture: Opened OpenCV video capture object.

    Raises:
        FileNotFoundError: If the video cannot be opened.
    """
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Could not open video: {path}")
    return cap


def extract_frame(cap: cv2.VideoCapture, frame_number: int):
    """Extract a specific frame from an opened video capture.

    Args:
        cap (cv2.VideoCapture): Opened OpenCV video capture object.
        frame_number (int): Index of the frame to extract.

    Returns:
        frame: The extracted OpenCV image frame.

    Raises:
        ValueError: If the frame number is out of range.
        RuntimeError: If the frame cannot be read.
    """
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_number < 0 or frame_number >= total:
        raise ValueError(f"Frame {frame_number} out of range — video has {total} frames (0 to {total - 1})")
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    if not ret:
        raise RuntimeError(f"Could not read frame {frame_number}")
    return frame


def get_display_size(config: dict) -> tuple[int, int]:
    """Get the desired display width and height from the configuration.

    Args:
        config (dict): Configuration dictionary.

    Returns:
        tuple[int, int]: Width and height for display/saving.
    """
    return config["video"]["display_width"], config["video"]["display_height"]


def get_video_path(args, config: dict) -> str:
    """Resolve the video path, prioritizing CLI arguments over config file.

    Args:
        args (argparse.Namespace): Parsed command-line arguments.
        config (dict): Configuration dictionary.

    Returns:
        str: Final video path to process.
    """
    return args.video or config["video"]["source"]
