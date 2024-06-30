"""Hello unit test module."""

from backend.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello backend"
