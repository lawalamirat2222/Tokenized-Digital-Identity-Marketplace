;; Identity Provider Verification Contract
;; Validates and manages credential issuers

(define-data-var admin principal tx-sender)

;; Map to store verified identity providers
(define-map verified-providers principal
  {
    name: (string-utf8 100),
    verified: bool,
    verification-date: uint,
    reputation-score: uint
  }
)

;; Public function to register a new identity provider
(define-public (register-provider (provider-name (string-utf8 100)))
  (let ((caller tx-sender))
    (if (is-provider caller)
      (err u1) ;; Already registered
      (ok (map-set verified-providers caller
        {
          name: provider-name,
          verified: false,
          verification-date: u0,
          reputation-score: u0
        }
      ))
    )
  )
)

;; Admin function to verify a provider
(define-public (verify-provider (provider principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (match (map-get? verified-providers provider)
        provider-data (ok (map-set verified-providers provider
          (merge provider-data {
            verified: true,
            verification-date: block-height
          })
        ))
        (err u2) ;; Provider not found
      )
      (err u3) ;; Not authorized
    )
  )
)

;; Update admin
(define-public (set-admin (new-admin principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (ok (var-set admin new-admin))
      (err u3) ;; Not authorized
    )
  )
)

;; Read-only function to check if a principal is a verified provider
(define-read-only (is-verified-provider (provider principal))
  (match (map-get? verified-providers provider)
    provider-data (get verified provider-data)
    false
  )
)

;; Read-only function to check if a principal is a registered provider
(define-read-only (is-provider (provider principal))
  (is-some (map-get? verified-providers provider))
)

;; Get provider details
(define-read-only (get-provider-details (provider principal))
  (map-get? verified-providers provider)
)

;; Update provider reputation score
(define-public (update-reputation (provider principal) (score uint))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (match (map-get? verified-providers provider)
        provider-data (ok (map-set verified-providers provider
          (merge provider-data {
            reputation-score: score
          })
        ))
        (err u2) ;; Provider not found
      )
      (err u3) ;; Not authorized
    )
  )
)
