
/**
 * Bulk Image Uploader for External Automations
 *
 * Add this function to your `http-functions.js` backend file.
 * 
 * ✅ Purpose:
 * Designed to help you bulk-upload images into a specified Wix Media Manager folder 
 * from external automation tools like Make.com, n8n, Zapier, etc.
 *
 * 💡 How it works:
 * - Accepts a POST request with a JSON payload.
 * - Each image must include a `publicUrl` (from an external source) and a `filename`.
 * - The function fetches each image and uploads it to the specified folder in Wix Media Manager.
 * - It does *not* attach images to a Wix CMS item.
 *
 * 🔐 Includes optional header-based authorization (see `isPermitted()` logic).
 * You can copy the isPermitted function from here: https://github.com/MCTO-the-dig/wix/blob/main/codeToUpdateAnyField
 *
 * 📥 Example POST body:
 * 
 * {
 *   "folderName": "external-uploads",
 *   "images": [
 *     {
 *       "imageName": "image1.jpg",
 *       "publicUrl": "https://example.com/images/image1.jpg"
 *     },
 *     {
 *       "imageName": "image2.png",
 *       "publicUrl": "https://example.com/images/image2.png"
 *     }
 *   ]
 * }
 * NOTE: you can pass to subdirectories in the folder name, eg.
 * "folderName": "blog-images/articelTitle"
 *
 * 📤 Response:
 * {
 *   "success": true,
 *   "uploaded": [
 *     {
 *       "originalUrl": "https://example.com/images/image1.jpg",
 *       "uploadJobId": "abc123",
 *       "fileName": "image1.jpg"
 *     },
 *     ...
 *   ]
 * }
 *
 * 🛠️ Tip:
 * Make sure `imageName` includes the file extension (e.g., `.jpg`, `.png`) for correct MIME type detection.
 */

export async function post_imageBulkUploader(request) {
    const headers = request.headers;

    if (!(await isPermitted(headers))) {
        return badRequest({
            headers: { "Content-Type": "application/json" },
            body: { error: "Not authorized" }
        });
    }

    try {
        const body = await request.body.json();
        const { folderName, images } = body;

        if (!folderName || !Array.isArray(images)) {
            throw new Error("Missing or invalid 'folderName' or 'images' array");
        }

        const uploadedResults = [];

        for (const image of images) {
            const { imageName, publicUrl } = image;

            if (!publicUrl) {
                console.warn(`Skipping image without publicUrl`);
                continue;
            }

            const fileName = imageName || publicUrl.split('/').pop() || `image-${Date.now()}.jpg`;
            const mimeType = getMimeType(fileName);

            const importResult = await mediaManager.importFile(`/${folderName}`, publicUrl, {
                mediaOptions: {
                    mimeType,
                    mediaType: "image"
                },
                metadataOptions: {
                    isPrivate: false,
                    isVisitorUpload: false
                    // No context needed since it's not attached to a collection
                }
            });

            uploadedResults.push({
                originalUrl: publicUrl,
                fileUrl: importResult.fileUrl,
                fileName: importResult.fileName,
                mediaId: importResult.mediaId
            });
        }

        return ok({
            headers: { "Content-Type": "application/json" },
            body: {
                success: true,
                uploaded: uploadedResults
            }
        });

    } catch (err) {
        console.error("Image upload error:", err);
        return badRequest({
            headers: { "Content-Type": "application/json" },
            body: {
                error: err.message
            }
        });
    }
}

// Include this: 
// helper function to set the mime type based on the image being imported.
// unless you already have it if you are using
// https://github.com/MCTO-the-dig/wix/blob/main/uploadImageToItem.js

function getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const map = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif'
    };
    return map[ext] || 'image/jpeg';
}




