"""Custom exceptions for GhostQueue ingestion and analytics."""


class GhostQueueException(Exception):
    """Base exception for all GhostQueue domain errors."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class UnsupportedFormatError(GhostQueueException):
    """Raised when uploaded file format is not supported."""

    pass


class EmptyDatasetError(GhostQueueException):
    """Raised when uploaded dataset contains no rows or columns."""

    pass


class MalformedDatasetError(GhostQueueException):
    """Raised when dataset cannot be parsed due to corrupt structure or syntax."""

    pass


class UnsupportedJsonStructureError(GhostQueueException):
    """Raised when JSON structure cannot be interpreted as tabular/queue data."""

    pass


class InsufficientDataError(GhostQueueException):
    """Raised when required analytical fields cannot be mapped or derived."""

    pass


class DatasetNotFoundError(GhostQueueException):
    """Raised when a requested registered dataset is not found."""

    def __init__(self, message: str = "Requested dataset not found in registry."):
        super().__init__(message, status_code=404)


class SessionNotFoundError(GhostQueueException):
    """Raised when a requested session is not found in an event log."""

    def __init__(self, message: str = "Requested session not found."):
        super().__init__(message, status_code=404)

