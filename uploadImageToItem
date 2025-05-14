// This function allows you to push images into an image field of a Wix collection
// using a public image URL. The image is uploaded into the Wix Media Manager
// and stored natively, just like images uploaded directly from the Wix Editor.

import { ok, badRequest } from "wix-http-functions"; // Enables HTTP response formatting
import { getSecret } from "wix-secrets-backend"; // Securely retrieve stored secret keys
import { mediaManager } from "wix-media-backend"; // API for uploading files to the Wix Media Manager

// Helper function to verify the request is authorized
// It checks the request headers for a key that matches the one saved in Wix Secrets Manager
async function isPermitted(headers) {
    try {
        const authHeader = headers.authorization || headers.auth; // Supports both header formats
        const sharedAuthKey = await getSecret("make_connector"); // Replace with your own secret key name
        return authHeader === sharedAuthKey; // If they match, access is granted
    } catch (err) {
        console.error("Error in authorization check:", err);
        return false;
    }
}

// Main HTTP function called when Make.com or another service sends a POST request
// Endpoint: https://yoursite.com/_functions/uploadImageToItem
export async function post_uploadImageToItem(request) {
    const headers = request.headers;

    // Check if request is authorized
    if (!(await isPermitted(headers))) {
        return badRequest({
            headers: { "Content-Type": "application/json" },
            body: { error: "Not authorized" }
        });
    }

    try {
        // Parse the JSON body sent in the request
        const body = await request.body.json();
        const { collectionName, itemId, updates } = body;

        // All three fields must be present to proceed
        if (!collectionName || !itemId || !updates) {
            throw new Error("Missing required fields: collectionName, itemId, or updates");
        }

        // Loop through all key-value pairs sent in the `updates` object
        for (const [key, value] of Object.entries(updates)) {
            // We're only interested in keys that start with "image_"
            if (key.startsWith("image_")) {
                const realKey = key.replace("image_", ""); // Strip off the prefix to get the actual field name
                const fileName = value.split('/').pop() || `image-${Date.now()}.jpg`; // Get filename from URL or generate one
                const mimeType = getMimeType(fileName); // Determine MIME type

                // Upload the image from the public URL into the Wix Media Manager
                const importResult = await mediaManager.importFile(`/${collectionName}`, value, {
                    mediaOptions: {
                        mimeType,
                        mediaType: "image"
                    },
                    metadataOptions: {
                        isPrivate: false,
                        isVisitorUpload: false,
                        context: {
                            collectionName: `${collectionName}`,
                            itemId: `${itemId}`,
                            fieldName: `${realKey}`
                        }
                    }
                });

                console.log(importResult); // For debugging

            } else {
                // Optional: you could add logic here to update non-image fields too
                // For now, only image fields prefixed with "image_" are handled
                // e.g. updatedItem[key] = value;
            }
        }

        // Return success response
        return ok({
            headers: { "Content-Type": "application/json" },
            body: {
                success: true
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

// Helper function to return the correct MIME type for an image based on file extension
function getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase(); // Get file extension
    const map = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif'
    };
    return map[ext] || 'image/jpeg'; // Default to JPEG if unknown
}

// Place this code inside your `backend/events.js` file in Wix

import wixData from 'wix-data'; // Used to interact with your site's collections (databases)

// This event is triggered when a file has been uploaded into Wix Media Manager
export function wixMediaManager_onFileUploaded(event) {
    const { context, fileInfo } = event; // Extract upload context and file details

    const { collectionName, itemId, fieldName } = context; // These were passed in the original upload context

    // Make sure all required data exists before proceeding
    if (collectionName && itemId && fieldName && fileInfo?.fileUrl) {
        const imageObj = {
            type: "image",
            src: fileInfo.fileUrl // This is the URL of the uploaded image in your Media Manager
        };

        // Fetch the database item and update its image field with the new image URL
        wixData.get(collectionName, itemId, { suppressAuth: true })
            .then(item => {
                item[fieldName] = fileInfo.fileUrl; // Set the image field to the uploaded file's URL
                console.log(fileInfo, fileInfo.fileUrl); // Debug log
                return wixData.update(collectionName, item, { suppressAuth: true }); // Save changes
            })
            .then(() => {
                console.log(`Image field "${fieldName}" updated for item ${itemId} in ${collectionName}`);
            })
            .catch(err => {
                console.error("Failed to update image field on item:", err); // Handle error
            });
    } else {
        console.warn("Missing context or fileUrl in upload event:", event); // Log if any required data is missing
    }
}
