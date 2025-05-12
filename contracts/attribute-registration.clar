;; Attribute Registration Contract
;; Records available identity claims/attributes

(define-data-var admin principal tx-sender)

;; Map to store attribute types
(define-map attribute-types uint
  {
    name: (string-utf8 100),
    description: (string-utf8 255),
    active: bool
  }
)

;; Map to track which providers can issue which attributes
(define-map provider-attributes
  { provider: principal, attribute-id: uint }
  { authorized: bool, timestamp: uint }
)

;; Counter for attribute IDs
(define-data-var next-attribute-id uint u1)

;; Register a new attribute type
(define-public (register-attribute-type (name (string-utf8 100)) (description (string-utf8 255)))
  (let ((caller tx-sender)
        (attribute-id (var-get next-attribute-id)))
    (if (is-eq caller (var-get admin))
      (begin
        (map-set attribute-types attribute-id
          {
            name: name,
            description: description,
            active: true
          }
        )
        (var-set next-attribute-id (+ attribute-id u1))
        (ok attribute-id)
      )
      (err u1) ;; Not authorized
    )
  )
)

;; Authorize a provider to issue a specific attribute
(define-public (authorize-provider (provider principal) (attribute-id uint))
  (let ((caller tx-sender))
    (if (and
          (is-eq caller (var-get admin))
          (is-some (map-get? attribute-types attribute-id))
        )
      (ok (map-set provider-attributes
        { provider: provider, attribute-id: attribute-id }
        { authorized: true, timestamp: block-height }
      ))
      (err u2) ;; Not authorized or attribute doesn't exist
    )
  )
)

;; Revoke a provider's authorization for an attribute
(define-public (revoke-provider-authorization (provider principal) (attribute-id uint))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (ok (map-set provider-attributes
        { provider: provider, attribute-id: attribute-id }
        { authorized: false, timestamp: block-height }
      ))
      (err u1) ;; Not authorized
    )
  )
)

;; Check if a provider is authorized for an attribute
(define-read-only (is-provider-authorized (provider principal) (attribute-id uint))
  (match (map-get? provider-attributes { provider: provider, attribute-id: attribute-id })
    auth-data (get authorized auth-data)
    false
  )
)

;; Get attribute details
(define-read-only (get-attribute-details (attribute-id uint))
  (map-get? attribute-types attribute-id)
)

;; Set attribute active status
(define-public (set-attribute-active (attribute-id uint) (active bool))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (match (map-get? attribute-types attribute-id)
        attribute-data (ok (map-set attribute-types attribute-id
          (merge attribute-data { active: active })
        ))
        (err u3) ;; Attribute not found
      )
      (err u1) ;; Not authorized
    )
  )
)

;; Update admin
(define-public (set-admin (new-admin principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (ok (var-set admin new-admin))
      (err u1) ;; Not authorized
    )
  )
)
