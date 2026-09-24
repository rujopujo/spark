"""Console logger shared by every module."""

import logging
import sys


def setup_logger(name="ParkSense", debug_mode=False):
    """Set up and configure a global logger with a standard formatter.

    Args:
        name (str, optional): Name of the logger. Defaults to "ParkSense".
        debug_mode (bool, optional): If True, sets level to DEBUG. Defaults to False.

    Returns:
        logging.Logger: Configured logger instance.
    """
    logger = logging.getLogger(name)

    if logger.hasHandlers():
        logger.setLevel(logging.DEBUG if debug_mode else logging.INFO)
        return logger

    logger.setLevel(logging.DEBUG if debug_mode else logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG if debug_mode else logging.INFO)

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    logger.propagate = False

    return logger


logger = logging.getLogger("ParkSense")
