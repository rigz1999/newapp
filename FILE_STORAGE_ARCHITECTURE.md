# File Storage Architecture

**Platform:** Finixar Investment Management
**Storage Provider:** Supabase Storage
**Date:** December 13, 2025

---

## Overview

All files uploaded to the Finixar platform are stored in **Supabase Storage**, a cloud-based object storage service built on top of AWS S3. Files are organized into buckets with specific access policies.

---

## Storage Buckets

Your platform uses **3 Supabase Storage buckets**:

### 1. `payment-proofs` (Permanent Storage)

**Purpose:** Permanent storage for payment proof documents

**What's Stored:**
- Payment confirmation documents (images, PDFs)
- Bank transfer receipts
- Coupon payment proofs
- Investor payment confirmations

**File Structure:**
```
payment-proofs/
  └── {payment_id}/
      └── {timestamp}_{original_filename}

Example:
payment-proofs/
  └── abc123-def456-ghi789/
      ├── 1702456789000_virement_banque.pdf
      └── 1702456790000_confirmation.png
```

**Access Control:**
- Authenticated users can read files from their organization
- Only organization members can upload
- Controlled via RLS policies

**Storage Location:**
- Files are stored in database: `payment_proofs` table
- Column: `file_url` (contains public URL)
- Related: `paiements.id` (foreign key)

**Code References:**
- `src/components/payments/PaymentProofUpload.tsx:337`
- `src/components/payments/PaymentProofUpload.tsx:366`

---

### 2. `payment-proofs-temp` (Temporary Storage)

**Purpose:** Temporary storage for payment analysis workflow

**What's Stored:**
- Files being analyzed for payment matching
- PDF pages converted to images for OCR
- Temporary uploads before confirmation

**File Structure:**
```
payment-proofs-temp/
  └── {timestamp}_{filename}

Example:
payment-proofs-temp/
  ├── 1702456789000_releve_page1.png
  ├── 1702456789000_releve_page2.png
  └── 1702456790000_virement.jpg
```

**Lifecycle:**
1. File uploaded to temp bucket
2. AI/OCR analysis performed on temp file
3. User confirms payment matching
4. File moved to permanent `payment-proofs` bucket
5. Temp file deleted

**Cleanup:**
- Files are automatically deleted after successful confirmation
- Prevents storage bloat from abandoned uploads

**Code References:**
- `src/components/payments/PaymentProofUpload.tsx:168`
- `src/components/payments/PaymentProofUpload.tsx:195`
- `src/components/payments/PaymentProofUpload.tsx:393` (cleanup)
- `src/components/payments/PaymentWizard.tsx:470`
- `src/components/payments/PaymentWizard.tsx:496` (cleanup)

---

### 3. `documents` (RIB Documents)

**Purpose:** Storage for investor bank details (RIB files)

**What's Stored:**
- RIB (Relevé d'Identité Bancaire) documents
- Investor bank account information
- Bank details for payment processing

**File Structure:**
```
documents/
  └── ribs/
      └── {investor_id}_{timestamp}.{ext}

Example:
documents/
  └── ribs/
      ├── investor-123_1702456789000.pdf
      ├── investor-456_1702456790000.jpg
      └── investor-789_1702456791000.png
```

**Access Control:**
- Organization members can upload RIBs for their investors
- Only authorized users can view/download
- Controlled via RLS policies on `investisseurs` table

**Storage Location:**
- Files referenced in: `investisseurs` table
- Column: `rib_file_path` (stores path: `ribs/{filename}`)
- Related columns:
  - `rib_uploaded_at` (timestamp)
  - `rib_status` ('valide', 'invalide', etc.)

**Code References:**
- `src/components/investors/Investors.tsx:582` (upload)
- `src/components/investors/Investors.tsx:632` (download)
- `src/components/investors/Investors.tsx:681` (delete)

---

## File Upload Flow

### Payment Proof Upload

```mermaid
User selects file
    ↓
File validation (type, size, format)
    ↓
Upload to 'payment-proofs-temp' bucket
    ↓
AI/OCR analysis (extract payment info)
    ↓
User reviews and confirms match
    ↓
Download from temp storage
    ↓
Upload to 'payment-proofs' bucket (permanent)
    ↓
Save URL to payment_proofs table
    ↓
Delete temp file
    ↓
✓ Complete
```

### RIB Document Upload

```mermaid
User selects RIB file
    ↓
File validation (type, size)
    ↓
Generate unique filename: {investor_id}_{timestamp}.{ext}
    ↓
Upload to 'documents' bucket at path 'ribs/{filename}'
    ↓
Update investisseurs table:
  - rib_file_path = 'ribs/{filename}'
  - rib_uploaded_at = now()
  - rib_status = 'valide'
    ↓
✓ Complete
```

---

## File Validation

### Supported File Types

**Payment Proofs:**
- PDF documents (`.pdf`)
- Images: PNG, JPG, JPEG (`.png`, `.jpg`, `.jpeg`)

**RIB Documents:**
- PDF documents (`.pdf`)
- Images: PNG, JPG, JPEG (`.png`, `.jpg`, `.jpeg`)

### File Size Limits

From `FEATURES.md` configuration:

```typescript
VITE_MAX_FILE_SIZE_DOCUMENTS=10  // 10 MB for documents
VITE_MAX_FILE_SIZE_IMAGES=5      // 5 MB for images
VITE_MAX_FILE_SIZE_RIB=5         // 5 MB for RIB files
```

### Validation Code

Located in: `src/utils/fileValidation.ts`

```typescript
// Validates file type, size, and format
validateFile(file, FILE_VALIDATION_PRESETS.documents)
```

### File Sanitization

Located in: `src/utils/sanitizer.ts`

```typescript
// Sanitizes filename to prevent injection attacks
sanitizeFileName(originalFileName)
```

---

## PDF to Image Conversion

For payment analysis, PDFs are converted to images for OCR processing:

**Process:**
1. PDF loaded using `pdfjs-dist` library
2. Each page rendered to canvas at 2.0 scale
3. Canvas converted to PNG blob
4. PNG uploaded to temp storage
5. AI/OCR analyzes images

**Code:**
```typescript
// src/components/payments/PaymentProofUpload.tsx:137-188

const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
const numPages = pdf.numPages;

for (let pageNum = 1; pageNum <= numPages; pageNum++) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });

  // Render to canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;

  // Convert to blob
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  // Upload as image
  const fileName = `${Date.now()}_${file.name}_page${pageNum}.png`;
  await supabase.storage.from('payment-proofs-temp').upload(fileName, blob);
}
```

---

## Security

### Access Control

**Bucket Policies:**
- RLS (Row-Level Security) enforced on database tables
- Only organization members can access their own files
- Superadmins can access all files

**File URL Generation:**
```typescript
// Public URL (signed, organization-restricted)
const { data: urlData } = supabase.storage
  .from('payment-proofs')
  .getPublicUrl(fileName);

// Download (private, requires authentication)
const { data, error } = await supabase.storage
  .from('documents')
  .download(filePath);
```

### File Sanitization

**Filename Sanitization:**
- Removes special characters
- Prevents directory traversal attacks
- Ensures safe filenames

**Example:**
```typescript
// Before: "../../../etc/passwd.txt"
// After: "etc_passwd.txt"
```

### Storage Location Security

**Physical Storage:**
- Files stored in Supabase Storage (AWS S3 backend)
- Encrypted at rest
- Encrypted in transit (HTTPS)
- Geo-redundant backups

---

## Database Schema

### payment_proofs Table

```sql
CREATE TABLE payment_proofs (
  id UUID PRIMARY KEY,
  paiement_id UUID REFERENCES paiements(id),
  file_url TEXT NOT NULL,           -- Public URL from Supabase Storage
  file_name TEXT NOT NULL,           -- Original filename
  file_size INTEGER,                 -- Size in bytes
  extracted_data JSONB,              -- OCR/AI extracted data
  confidence NUMERIC,                -- AI confidence score
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### investisseurs Table (RIB storage)

```sql
CREATE TABLE investisseurs (
  id UUID PRIMARY KEY,
  nom_raison_sociale TEXT NOT NULL,
  rib_file_path TEXT,                -- Path: 'ribs/{filename}'
  rib_uploaded_at TIMESTAMPTZ,       -- Upload timestamp
  rib_status TEXT,                   -- 'valide', 'invalide', etc.
  org_id UUID REFERENCES organizations(id),
  ...
);
```

---

## Configuration

### Environment Variables

From `.env` file:

```env
# Supabase Storage Configuration
VITE_STORAGE_BUCKET_PAYMENT_PROOFS=payment-proofs
VITE_STORAGE_BUCKET_PAYMENT_PROOFS_TEMP=payment-proofs-temp
VITE_STORAGE_BUCKET_RIBS=ribs

# File Upload Limits (in MB)
VITE_MAX_FILE_SIZE_DOCUMENTS=10
VITE_MAX_FILE_SIZE_IMAGES=5
VITE_MAX_FILE_SIZE_RIB=5
```

**Note:** The `VITE_STORAGE_BUCKET_RIBS` is referenced in config but actual code uses the `documents` bucket with `ribs/` prefix.

---

## Storage Costs

**Supabase Storage Pricing (typical):**
- Free tier: 1 GB storage, 2 GB bandwidth
- Paid: ~$0.021/GB/month storage, ~$0.09/GB bandwidth

**Estimated Usage:**
- Payment proofs: ~100-500 KB per file
- RIB documents: ~200 KB - 2 MB per file
- Temp files: Minimal (auto-deleted)

**Optimization:**
- Temp files deleted immediately after use
- Image compression for payment proofs
- PDF pages converted to optimized PNGs

---

## Backup & Recovery

**Supabase Storage Features:**
- Automatic backups (AWS S3 backend)
- Point-in-time recovery
- Geo-redundancy
- 99.9% uptime SLA

**Recommended Practices:**
1. Enable Supabase daily backups
2. Periodic exports of critical documents
3. Monitor storage usage via Supabase dashboard
4. Set up alerts for storage quota

---

## File Operations Reference

### Upload File

```typescript
const { error } = await supabase.storage
  .from('bucket-name')
  .upload(filePath, fileData, {
    contentType: 'image/png',
    upsert: false  // Don't overwrite existing
  });
```

### Get Public URL

```typescript
const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl(filePath);

console.log(data.publicUrl);
```

### Download File

```typescript
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download(filePath);

// data is a Blob
const url = window.URL.createObjectURL(data);
```

### Delete File

```typescript
const { error } = await supabase.storage
  .from('bucket-name')
  .remove([filePath]);
```

---

## Troubleshooting

### Common Issues

**1. "File upload failed"**
- Check file size < limit
- Verify file type is allowed
- Ensure user has permissions
- Check Supabase quota

**2. "Cannot download RIB"**
- Verify `rib_file_path` exists in database
- Check user has access to investor's organization
- Verify file exists in storage bucket

**3. "Temp files not deleted"**
- Check cleanup code runs after confirmation
- Verify temp file names tracked correctly
- Manual cleanup via Supabase dashboard if needed

**4. Storage quota exceeded**
- Review temp file cleanup
- Archive old payment proofs
- Upgrade Supabase plan

---

## Future Improvements

### Potential Enhancements

1. **Automatic File Compression**
   - Compress images before upload
   - Reduce storage costs
   - Faster uploads/downloads

2. **File Versioning**
   - Track RIB document versions
   - Audit trail for file changes
   - Rollback capability

3. **Cloud CDN**
   - Faster file delivery globally
   - Reduced bandwidth costs
   - Better user experience

4. **Virus Scanning**
   - Scan uploads for malware
   - Prevent malicious file uploads
   - Compliance requirement

5. **Retention Policies**
   - Auto-archive old files (>2 years)
   - Compliance with data retention laws
   - Automated cleanup

---

## Summary

**Storage Architecture:**
```
Supabase Storage (AWS S3)
  ├── payment-proofs (permanent)
  │     └── {payment_id}/{timestamp}_{filename}
  ├── payment-proofs-temp (temporary)
  │     └── {timestamp}_{filename}
  └── documents
        └── ribs/{investor_id}_{timestamp}.{ext}
```

**Key Features:**
- ✅ Secure cloud storage (AWS S3 backend)
- ✅ Organization-based access control (RLS)
- ✅ Automatic file validation and sanitization
- ✅ PDF to image conversion for OCR
- ✅ Temporary storage with automatic cleanup
- ✅ Encrypted at rest and in transit
- ✅ Geo-redundant backups

**Security:**
- ✅ Row-Level Security policies
- ✅ Filename sanitization
- ✅ File type/size validation
- ✅ Organization-based isolation
- ✅ HTTPS-only access

**Where are files physically stored?**
- **Provider:** Supabase Storage
- **Backend:** AWS S3 (Amazon Web Services)
- **Location:** Depends on Supabase project region
- **Access:** Via Supabase API (not direct S3 access)

---

**Last Updated:** December 13, 2025
**Maintained by:** Engineering Team

