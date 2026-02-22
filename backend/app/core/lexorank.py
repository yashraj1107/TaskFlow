import string

CHARSET = string.digits + string.ascii_lowercase  # 0-9a-z, base 36
MIN_CHAR = CHARSET[0]   # '0'
MID_CHAR = CHARSET[len(CHARSET) // 2]  # 'i'
MAX_CHAR = CHARSET[-1]  # 'z'

# Sentinel boundaries - never stored, just used as computation anchors
RANK_MIN = "0"
RANK_MAX = "z" * 6  # 'zzzzzz' - practically unreachable


def _char_to_int(c: str) -> int:
    return CHARSET.index(c)


def _int_to_char(i: int) -> str:
    return CHARSET[i]


def _rank_to_int(rank: str) -> int:
    result = 0
    for c in rank:
        result = result * len(CHARSET) + _char_to_int(c)
    return result


def _int_to_rank(value: int, min_length: int = 1) -> str:
    if value == 0:
        return CHARSET[0] * min_length
    base = len(CHARSET)
    chars = []
    while value > 0:
        chars.append(_int_to_char(value % base))
        value //= base
    rank = "".join(reversed(chars))
    return rank.zfill(min_length) if len(rank) < min_length else rank


def midpoint(before: str | None, after: str | None) -> str:
    lo = before or RANK_MIN
    hi = after or (RANK_MAX)

    # Pad to same length
    max_len = max(len(lo), len(hi)) + 1
    lo_padded = lo.ljust(max_len, MIN_CHAR)
    hi_padded = hi.ljust(max_len, MIN_CHAR)

    lo_int = _rank_to_int(lo_padded)
    hi_int = _rank_to_int(hi_padded)

    if hi_int - lo_int <= 1:
        return lo + MID_CHAR

    mid_int = (lo_int + hi_int) // 2
    result = _int_to_rank(mid_int, max_len)

    result = result.rstrip(MIN_CHAR) or MIN_CHAR
    return result


def initial_rank() -> str:
    return MID_CHAR


def generate_ranks_for_list(count: int) -> list[str]:
    if count == 0:
        return []
    if count == 1:
        return [initial_rank()]

    base = len(CHARSET)

    step = (base ** 4) // (count + 1)
    ranks = []
    for i in range(1, count + 1):
        val = step * i
        ranks.append(_int_to_rank(val, 4))
    return ranks
