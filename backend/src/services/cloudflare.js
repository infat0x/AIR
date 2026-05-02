/**
 * Cloudflare IP Range Detection
 * Checks if an IP falls within Cloudflare's known IP ranges
 */

// Cloudflare's published IP ranges (as of 2025)
// Source: https://www.cloudflare.com/ips/
const CLOUDFLARE_IPV4_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

/**
 * Convert CIDR block to min/max IP integer range
 */
function cidrToRange(cidr) {
  const [ip, bits] = cidr.split('/');
  const mask = bits ? parseInt(bits) : 32;
  const ipInt = ipToInt(ip);
  const start = ipInt & (0xffffffff << (32 - mask));
  const end = start | ((1 << (32 - mask)) - 1);
  return { start: start >>> 0, end: end >>> 0 };
}

/**
 * Convert IP string to integer
 */
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet), 0) >>> 0;
}

// Pre-compute ranges at module load
const CF_RANGES = CLOUDFLARE_IPV4_RANGES.map(cidrToRange);

/**
 * Check if an IP address belongs to Cloudflare
 * @param {string} ip - IPv4 address
 * @returns {boolean}
 */
export function isCloudflareIP(ip) {
  if (!ip || !ip.includes('.')) return false;
  try {
    const ipInt = ipToInt(ip);
    return CF_RANGES.some((range) => ipInt >= range.start && ipInt <= range.end);
  } catch {
    return false;
  }
}

/**
 * Check if any of the given IPs are Cloudflare IPs
 * @param {string[]} ips
 * @returns {boolean}
 */
export function hasCloudflareIP(ips) {
  return ips.some(isCloudflareIP);
}
