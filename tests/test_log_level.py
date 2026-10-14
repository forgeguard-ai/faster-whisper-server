"""LOG_LEVEL: the server's log level, with a typo falling back to INFO."""

import importlib

import pytest

from server import config


@pytest.fixture
def reload_config(monkeypatch):
    def _load(value):
        if value is None:
            monkeypatch.delenv("LOG_LEVEL", raising=False)
        else:
            monkeypatch.setenv("LOG_LEVEL", value)
        return importlib.reload(config).LOG_LEVEL

    yield _load
    monkeypatch.delenv("LOG_LEVEL", raising=False)
    importlib.reload(config)


@pytest.mark.parametrize(
    ("value", "want"),
    [(None, "INFO"), ("debug", "DEBUG"), (" Warning ", "WARNING"), ("ERROR", "ERROR"), ("verbose", "INFO"), ("", "INFO")],
)
def test_log_level(reload_config, value, want):
    assert reload_config(value) == want
