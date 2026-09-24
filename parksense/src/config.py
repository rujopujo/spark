"""Load config.yaml and apply command-line overrides on top of it."""

import yaml


def load_config(path: str) -> dict:
    """Load configuration from a YAML file.

    Args:
        path (str): Path to the YAML configuration file.

    Returns:
        dict: Parsed configuration dictionary.
    """
    with open(path, "r") as f:
        return yaml.safe_load(f)


def apply_overrides(config: dict, args) -> dict:
    """Overwrite config values with any CLI args the user explicitly passed.

    Args:
        config (dict): Configuration dictionary loaded from YAML.
        args (argparse.Namespace): Parsed command-line arguments.

    Returns:
        dict: Updated configuration dictionary.
    """
    if args.confidence is not None:
        config["model"]["confidence"] = args.confidence
    if args.model is not None:
        config["model"]["path"] = args.model
    if getattr(args, "frame_interval", None) is not None:
        config["video"]["frame_interval"] = args.frame_interval
    if getattr(args, "max_frames", None) is not None:
        config["video"]["max_frames"] = args.max_frames
    if getattr(args, "no_slots", False):
        config["parking"]["slots_path"] = ""
    return config
