# Secure Media Delivery — Backend Requirements

## 1. Purpose

The archive currently returns permanent Amazon S3 object URLs in API DTOs. The
frontend then assigns those URLs directly to `<img>`, `<audio>`, `<video>`, PDF,
cover, and thumbnail sources. Anyone who can open browser developer tools can
therefore see and retain the permanent S3 address.

This document defines the backend changes required to:

- keep the S3 bucket and object keys private;
- continue showing public media to guest users;
- allow Admin and Employee users to view all authorized media;
- deny private media to guest users;
- remove permanent S3 URLs from API responses;
- preserve image loading, video/audio seeking, PDF viewing, thumbnails, and
  cover images;
- enforce access rules on the server instead of relying on frontend controls.

## 2. Current Problem

Current DTO fields include values such as:

```json
{
  "imageFileUrl": "https://bucket.s3.region.amazonaws.com/private-folder/file.jpg"
}
```

The frontend renders the value directly:

```html
<img src="https://bucket.s3.region.amazonaws.com/private-folder/file.jpg">
```

Blocking right-click, dragging, keyboard shortcuts, or the browser download
button does not secure the file. These are only interface restrictions. The
browser must retrieve the bytes to display the media, so an authorized viewer
can always inspect the request or capture the displayed content.

Hashing a URL in the frontend is also not security. If the browser can resolve
the hash without a protected backend, an attacker can resolve it in the same
way. A `blob:` URL only changes what appears in the DOM; the original network
request remains visible.

## 3. Security Objective

The objective is to hide permanent storage addresses and enforce access before
returning media bytes.

The system must expose an application-controlled reference:

```html
<img src="https://api.example.com/api/guest/media/image/IMG-001/content">
```

It must not expose the storage reference:

```html
<img src="https://bucket.s3.region.amazonaws.com/archive/images/original.jpg">
```

The application endpoint will still be visible in Developer Tools. This is
expected and safe: it contains only the media type and application code, while
the backend performs authorization and keeps the S3 key secret.

## 4. Important Security Limit

Media intentionally published to guests remains obtainable by guests. If a
visitor is allowed to view an image, the visitor can take a screenshot or save
the received bytes. No web application can guarantee otherwise.

This design protects:

- private and hidden records;
- permanent S3 URLs and internal folder names;
- access after a user loses permission;
- unpublished project media;
- direct access that bypasses backend visibility rules.

It does not provide DRM or make publicly displayed content impossible to copy.

## 5. Required Architecture

```text
Browser
  │
  │ GET /api/guest/media/image/{code}/content
  │ or GET /api/media/image/{code}/content
  ▼
Spring backend
  ├─ resolves record by type and code
  ├─ checks removed/deleted state
  ├─ checks item and project visibility for guests
  ├─ checks authenticated permission for staff
  ├─ resolves the S3 key internally
  └─ streams the object from private S3
       │
       ▼
Private S3 bucket
```

The browser must never submit an S3 URL, bucket name, filesystem path, or S3
key to the media endpoint. The backend must derive the object from the database
record selected by `{type}` and `{code}`.

## 6. Required Endpoints

### 6.1 Guest media

```http
GET  /api/guest/media/{type}/{code}/content
HEAD /api/guest/media/{type}/{code}/content
```

Allowed `{type}` values:

- `image`
- `audio`
- `video`
- `text`

Optional variants:

```http
GET  /api/guest/media/text/{code}/cover
HEAD /api/guest/media/text/{code}/cover

GET  /api/guest/media/video/{code}/poster
HEAD /api/guest/media/video/{code}/poster
```

The guest endpoints must return bytes only when all applicable conditions are
true:

- the media record exists;
- the media record is not soft-deleted;
- the media record is public;
- the parent project exists and is public;
- the parent project is not soft-deleted;
- the requested variant belongs to that record.

Return `404 Not Found` for unavailable or hidden guest media. Using `404`
instead of `403` avoids confirming that a private code exists.

### 6.2 Authenticated staff media

```http
GET  /api/media/{type}/{code}/content
HEAD /api/media/{type}/{code}/content
```

Optional variants:

```http
GET  /api/media/text/{code}/cover
HEAD /api/media/text/{code}/cover

GET  /api/media/video/{code}/poster
HEAD /api/media/video/{code}/poster
```

The staff endpoint must require a valid session and the matching read
permission:

| Media type | Required authority |
|---|---|
| Image | `image:read` |
| Audio | `audio:read` |
| Video | `video:read` |
| Text | `text:read` |

Admin and Employee users may view private records when their backend
permissions allow it. Guest visibility flags must not restrict properly
authorized staff access.

Return:

- `401` when no valid session exists;
- `403` when the authenticated account lacks permission;
- `404` when the record or asset does not exist.

## 7. DTO Requirements

Permanent storage URLs must not be serialized in guest, staff, unified item,
project-media, search, trending, or detail responses.

Fields requiring migration include, where applicable:

- `fileUrl`
- `imageFileUrl`
- `audioFileUrl`
- `videoFileUrl`
- `textFileUrl`
- `coverImageUrl`
- `thumbnailUrl`
- `posterUrl`
- person portrait URLs;
- project cover URLs.

DTOs should return protected application references or structured asset data.

Recommended shape:

```json
{
  "imageCode": "IMG-001",
  "asset": {
    "available": true,
    "contentPath": "/api/guest/media/image/IMG-001/content",
    "contentType": "image/jpeg"
  }
}
```

Staff example:

```json
{
  "imageCode": "IMG-001",
  "asset": {
    "available": true,
    "contentPath": "/api/media/image/IMG-001/content",
    "contentType": "image/jpeg"
  }
}
```

For a safe transition, legacy URL field names may temporarily contain the
protected application path, but they must never contain the S3 URL:

```json
{
  "imageFileUrl": "/api/guest/media/image/IMG-001/content"
}
```

Structured `asset` data is preferred because it clearly separates an
application reference from a storage URL.

## 8. S3 Requirements

The S3 bucket must be private.

Required AWS configuration:

- enable all S3 Block Public Access settings;
- remove public-read bucket policies and public object ACLs;
- use bucket-owner-enforced object ownership where possible;
- grant `s3:GetObject` only to the backend runtime role/user and approved CDN
  origin;
- grant write/delete permissions only to backend operations that require them;
- never place AWS access keys in frontend environment variables;
- never return the bucket name or object key to the client;
- enable server-side encryption for stored objects;
- enable access logging or CloudTrail data events according to operational
  requirements.

Do not enable Block Public Access until the protected delivery endpoints have
been deployed and verified. Otherwise existing media will stop loading.

## 9. Streaming Requirements

### 9.1 Images and small covers

Images may be streamed directly from S3 through the backend response. The
backend must preserve the correct content type and must not load unnecessarily
large assets multiple times.

### 9.2 Audio, video, and large PDFs

Do not copy the current full-object-in-memory Maqam implementation for large
archive media. Video, long audio, and PDF files must support ranged delivery.

The backend must:

- accept `Range` and `If-Range` request headers;
- issue a corresponding ranged S3 `GetObject` request;
- stream the S3 response without converting the whole object to `byte[]`;
- return `206 Partial Content` for valid range requests;
- return `416 Range Not Satisfiable` for invalid ranges;
- preserve `Content-Range`;
- preserve the exact ranged `Content-Length`;
- return `Accept-Ranges: bytes`;
- support `HEAD` without downloading the body;
- preserve `ETag` and `Last-Modified` when available;
- close S3 streams when the client disconnects;
- avoid buffering entire video, audio, or PDF files in application memory.

Example successful range response:

```http
HTTP/1.1 206 Partial Content
Content-Type: video/mp4
Accept-Ranges: bytes
Content-Range: bytes 0-1048575/734003200
Content-Length: 1048576
Content-Disposition: inline
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
```

## 10. Response Header Requirements

Every protected media response should include:

```http
Content-Disposition: inline
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

Authenticated/private responses should use:

```http
Cache-Control: private, no-store
```

Public guest thumbnails may use controlled caching only after visibility and
revocation behavior is defined. Public caching must never be used for private
staff media.

The backend CORS configuration must expose headers needed by JavaScript/PDF
viewers, including where applicable:

- `Accept-Ranges`
- `Content-Range`
- `Content-Length`
- `Content-Type`
- `ETag`
- `Last-Modified`

## 11. Authentication Requirements

Native `<img>`, `<audio>`, and `<video>` elements cannot attach a Bearer token
stored in JavaScript. The current backend also supports an HttpOnly JWT cookie,
which should be used for direct protected media requests.

Requirements:

- production cookie must be `Secure` and `HttpOnly`;
- use an appropriate `SameSite` policy for the deployed frontend/backend
  origins;
- media requests must include credentials;
- CORS must allow only approved frontend origins with credentials;
- logout must call the backend logout endpoint and clear the authentication
  cookie, not only remove the local-storage token;
- expired, revoked, and disabled sessions must immediately lose media access;
- application JWTs must never be placed in query parameters.

If cross-site cookie reliability is unacceptable, place the API behind a
same-origin reverse proxy or use a short-lived, narrowly scoped media ticket.

## 12. Authorization Rules

Authorization must be implemented in backend services, not inferred from data
sent by the browser.

The backend must never trust client-provided values such as:

- `isPublic`;
- `role`;
- `projectVisibleToPublic`;
- an S3 URL;
- an object key;
- an owner/user ID used to claim access.

The backend must load the record and relationships from the database and make
the authorization decision from trusted data.

### Guest decision

```text
allow = media exists
    AND media.removedAt is null
    AND media.isPublic is true
    AND project exists
    AND project.removedAt is null
    AND project.isVisibleToPublic is true
```

If the product treats null visibility as public for legacy records, that rule
must be explicitly documented and tested. Do not let null handling vary between
list APIs, detail APIs, and media byte endpoints.

### Staff decision

```text
allow = authenticated
    AND account is active
    AND token/session is not revoked
    AND user has the matching media read authority
    AND record exists under the staff retention/trash policy
```

## 13. Content-Type Safety

The server should use trusted S3 metadata or stored backend metadata for the
response content type. Do not trust a query parameter or arbitrary filename.

Use an allow-list appropriate to each endpoint, for example:

- images: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/tiff`;
- audio: approved `audio/*` formats;
- video: approved `video/*` formats;
- text: `application/pdf` and explicitly supported document formats.

Unknown types should use `application/octet-stream` or be rejected according to
the archive policy. Always return `X-Content-Type-Options: nosniff`.

## 14. Audit and Abuse Protection

The backend should record media access events containing:

- timestamp;
- media type and code;
- guest or authenticated actor ID;
- endpoint variant (`content`, `cover`, `poster`);
- allowed or denied result;
- response status;
- requested range;
- request/IP/session identifiers allowed by the privacy policy.

Do not log:

- AWS credentials;
- JWT values;
- signed cookies;
- full S3 URLs or keys;
- private query tokens.

Add rate limiting for guest media endpoints and anomalous high-volume access.
Range requests must be included in rate/abuse calculations without treating
normal video seeking as a separate full download.

## 15. Frontend Contract

The backend must provide enough information for the frontend to select the
correct protected endpoint without knowing any storage details.

Guest pages use:

```text
/api/guest/media/{type}/{code}/content
```

Admin and Employee pages use:

```text
/api/media/{type}/{code}/content
```

The frontend will use these references for:

- card thumbnails;
- detail hero images;
- full image viewers;
- audio players;
- video players and posters;
- PDF readers;
- text cover images;
- project covers;
- person portraits.

The frontend must not need an S3 bucket name, region, key, or permanent URL.

## 16. Recommended Spring Components

Suggested backend structure:

```text
platform/api/media/MediaAssetAPI.java
platform/service/media/MediaAssetService.java
platform/service/media/MediaAccessPolicy.java
platform/dto/media/MediaAssetReferenceDTO.java
S3Service.java  (add metadata/ranged streaming operations)
```

Responsibilities:

### `MediaAssetAPI`

- validate `{type}`, `{code}`, and variant;
- distinguish guest and staff routes;
- delegate authorization and resolution;
- construct correct HTTP responses;
- never accept storage paths from clients.

### `MediaAccessPolicy`

- enforce guest media/project visibility;
- enforce staff permissions;
- centralize null-visibility behavior;
- prevent list/detail/content authorization differences.

### `MediaAssetService`

- resolve the database record;
- select content/cover/poster storage reference internally;
- request metadata or a range from S3;
- return a streaming response description;
- avoid exposing internal storage references to controllers or DTOs that are
  serialized to clients.

### `S3Service`

- support `HEAD`/metadata lookup;
- support ranged `GetObject` requests;
- expose a closeable stream, length, content type, ETag, and modification date;
- retain existing upload/delete functionality;
- avoid full-object buffering for large media.

## 17. Deployment and Migration Order

Use this order to avoid breaking the public application:

1. Add protected media endpoints while keeping existing URLs temporarily.
2. Add integration tests for guest and staff access.
3. Deploy the backend endpoints.
4. Update the frontend to use protected references for every media surface.
5. Verify image, audio, video, PDF, cover, thumbnail, and portrait behavior.
6. Stop serializing raw S3 URLs in all DTOs and item/search responses.
7. Verify Developer Tools contains only application media endpoints.
8. Enable S3 Block Public Access and remove public bucket policies/ACLs.
9. Verify direct historical S3 URLs now return access denied.
10. Monitor error rates, range responses, memory, bandwidth, and authorization
    denials after rollout.

Do not reverse steps 6–8 without a rollback plan. Removing DTO URLs before the
frontend understands protected references will make media disappear. Making S3
private before the gateway works will break all current media.

## 18. Acceptance Criteria

### Guest behavior

- A guest can view media only when both the item and its project are public.
- A guest receives `404` for private, removed, or hidden-project media.
- Public guest images continue to render in cards and detail pages.
- Public guest audio/video supports normal playback and seeking.
- Public PDFs continue to render.

### Staff behavior

- Admin and authorized Employee users can view public and private media.
- An authenticated user without the matching read permission receives `403`.
- Logging out immediately prevents protected media access.
- Revoked/expired sessions cannot retrieve new media ranges.

### Storage protection

- No guest or staff DTO contains an S3 URL or object key.
- No HTML `src` or `href` contains an S3 URL.
- Browser Network shows the application media endpoint, not S3.
- Previously copied permanent S3 URLs fail after the bucket becomes private.
- S3 credentials are present only in backend runtime configuration.

### Streaming correctness

- `HEAD` returns metadata without a body.
- A normal request returns `200` with the correct content type and length.
- A valid range returns `206` with correct `Content-Range` and length.
- An invalid range returns `416`.
- Large video/audio/PDF requests do not load the entire object into JVM memory.
- Concurrent seeking does not cause excessive memory growth.

## 19. Required Tests

At minimum, add automated tests covering:

1. public item + public project + guest = `200`;
2. private item + guest = `404`;
3. public item + private project + guest = `404`;
4. removed item + guest = `404`;
5. private item + authorized Admin = `200`;
6. private item + authorized Employee = `200`;
7. missing session on staff endpoint = `401`;
8. wrong permission = `403`;
9. unknown code = `404`;
10. invalid type/variant = `400` or `404` according to API convention;
11. full GET response headers and body;
12. HEAD response with no body;
13. first, middle, open-ended, and final byte ranges;
14. unsatisfiable range = `416`;
15. text cover and video poster cannot resolve another record's object;
16. DTO serialization contains no `amazonaws.com`, bucket name, or S3 key;
17. logout/revocation prevents subsequent protected requests;
18. direct S3 URL fails once Block Public Access is enabled.

## 20. Definition of Done

This task is complete only when:

- the backend is the sole authority for media access;
- S3 is private;
- guest media still works according to visibility rules;
- staff media works according to permissions;
- all permanent S3 URLs are removed from serialized API responses;
- all frontend media surfaces use protected application references;
- large media supports true ranged streaming;
- direct S3 access is denied;
- automated authorization, DTO-leak, and streaming tests pass.

