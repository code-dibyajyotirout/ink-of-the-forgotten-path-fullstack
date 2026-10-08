"""Server-side XOR obfuscation decoding and signature verification service."""

import base64
from typing import Tuple


class ServerSecurityService:
    DEFAULT_KEY = "AnimatrousSecureMesh_2026"

    @staticmethod
    def fnv1a_checksum(data: str) -> str:
        """32-bit FNV-1a non-cryptographic checksum."""
        h = 0x811C9DC5
        for ch in data:
            h ^= ord(ch)
            h = (h * 0x01000193) & 0xFFFFFFFF
        return f"{h:08x}"

    @classmethod
    def decrypt_payload(cls, encoded_b64: str, key: str = DEFAULT_KEY) -> Tuple[bool, str]:
        """Decrypt Base64 XOR encoded payload."""
        try:
            raw_bytes = base64.b64decode(encoded_b64.encode("ascii"))
            raw_str = raw_bytes.decode("latin1")
            
            # XOR reverse
            key_len = len(key)
            decrypted_chars = []
            for i, c in enumerate(raw_str):
                decrypted_chars.append(chr(ord(c) ^ ord(key[i % key_len])))
            
            result = "".join(decrypted_chars)
            return True, result
        except Exception:
            return False, ""

    @classmethod
    def verify_packet(cls, payload_b64: str, expected_sig: str, key: str = DEFAULT_KEY) -> bool:
        """Verify decrypted payload signature against expected checksum."""
        ok, decrypted = cls.decrypt_payload(payload_b64, key)
        if not ok:
            return False
        computed_sig = cls.fnv1a_checksum(decrypted)
        return computed_sig == expected_sig
