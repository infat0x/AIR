Am I Reachable? - Professional Reconnaissance Framework
=======================================================

"Am I Reachable?" is a modern full-stack reconnaissance platform designed to 
replace legacy shell scripts with a high-performance, asynchronous domain 
scanning engine. It provides security professionals with a centralized 
dashboard to monitor external infrastructure visibility.

System Architecture
-------------------



The application follows a decoupled Microservices-lite architecture:

    +-------------------+      JSON API      +-----------------------+
    |   Next.js UI      | <----------------> |   Express.js Backend  |
    |  (Port 3000)      |      Requests      |     (Port 3001)       |
    +---------+---------+                    +-----------+-----------+
              |                                          |
              |                                          v
      User Dashboard                       +----------------------------+
      Real-time Stats                      | Scanning Engine (Workers)  |
      Multi-lang UI                        | - DNS Resolver             |
      Export Logic                         | - TCP Handshake (80/443)   |
                                           | - Header Security Auditor  |
                                           +-------------+--------------+
                                                         |
                                                         v
                                               External Infrastructure
                                               (Targets: Domains/IPs)

Scan Execution Logic
--------------------

http://googleusercontent.com/image_content/170



The engine processes targets using a prioritized asynchronous pipeline:

1. Target Parsing: Validates input and filters out DNS-only records (e.g., _dmarc).
2. DNS Resolution: Performs lookups to verify domain existence and map IP history.
3. TCP Handshake: Attempts low-level connections to verify port accessibility.
4. Application Layer Audit: Fetches HTTP response codes and security headers.
5. Caching: Stores results in a 24-hour TTL (Time-To-Live) memory cache.

Technical Specifications & Performance
======================================

The scanner is optimized for high-concurrency environments:

Feature              | Specification / Detail
---------------------|---------------------------------------------------------
Concurrency Model    | Configurable Worker Threads (Default: 12, Up to 100+)
Network Protocol     | IPv4/IPv6 Support with TCP 80/443 default checking
Security Auditing    | CSP, HSTS, X-Frame-Options, and X-Content-Type detection
Localization (i18n)  | Dynamic switching between EN, AZ, and RU
Data Portability     | Client-side and Server-side JSON/CSV/HTML exports
Deployment           | Docker-ready (Node:18-alpine base image)

Technical Role Manuals
======================

Offensive Security / Red Teamer
-------------------------------
* Attack Surface Mapping: Identify "live" assets across thousands of subdomains.
* Fingerprinting: Analyze response headers to detect backend technologies.
* Report Automation: Utilize the HTML export feature for immediate client reporting.

System Administrator / SOC Analyst
----------------------------------
* Shadow IT Detection: Identify rogue web servers active on the corporate network.
* Compliance Checking: Ensure all public-facing assets have HSTS and CSP enabled.
* Resource Scaling: Adjust worker counts via .env to match server bandwidth.

API Usage Example
-----------------

To trigger a scan programmatically:

POST /api/scan
Content-Type: application/json
{
    "domains": [{"domain": "target.com", "subdomains": ["api", "dev"]}],
    "options": {"workers": 25, "timeout": 5000}
}

Security & Compliance Note
--------------------------
This tool is intended for authorized security testing only. Users must ensure 
compliance with local laws and organizational policies regarding automated 
vulnerability scanning and network reconnaissance.