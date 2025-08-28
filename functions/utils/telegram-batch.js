// Telegram sendMediaGroup 工具函数

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Telegram限制)
const MAX_FILES = 10; // Telegram sendMediaGroup最大文件数
const MIN_FILES = 2;  // sendMediaGroup最少文件数

/**
 * 验证上传的文件
 * @param {File[]} files - 上传的文件数组
 * @returns {Object} 验证结果 {valid: boolean, error?: string}
 */
export function validateFiles(files) {
    // 检查文件数量
    if (files.length < MIN_FILES) {
        return {
            valid: false,
            error: `批量上传至少需要${MIN_FILES}个文件`
        };
    }
    
    if (files.length > MAX_FILES) {
        return {
            valid: false,
            error: `批量上传最多支持${MAX_FILES}个文件`
        };
    }

    // 检查文件类型一致性和有效性
    let isImageBatch = false;
    let isVideoBatch = false;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 检查文件大小
        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `文件 "${file.name}" 大小超过50MB限制`
            };
        }
        
        // 检查文件类型
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
        
        if (!isImage && !isVideo) {
            return {
                valid: false,
                error: `文件 "${file.name}" 类型不支持，只支持图片和视频文件`
            };
        }
        
        // 确保同一批次中文件类型一致
        if (i === 0) {
            isImageBatch = isImage;
            isVideoBatch = isVideo;
        } else {
            if ((isImageBatch && !isImage) || (isVideoBatch && !isVideo)) {
                return {
                    valid: false,
                    error: '批量上传的文件必须是同一类型（全部为图片或全部为视频）'
                };
            }
        }
    }

    return { valid: true };
}

/**
 * 创建批次ID
 * @returns {string} 唯一的批次标识符
 */
export function createBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 通过Telegram sendMediaGroup API上传文件
 * @param {File[]} files - 文件数组
 * @param {Object} env - 环境变量
 * @param {string} batchId - 批次ID
 * @returns {Promise<Object>} 上传结果
 */
export async function sendMediaGroupToTelegram(files, env, batchId) {
    try {
        // 构建media数组
        const media = await Promise.all(files.map(async (file, index) => {
            const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
            const mediaType = isImage ? 'photo' : 'video';
            
            return {
                type: mediaType,
                media: `attach://file${index}`,
                caption: index === 0 ? `Batch: ${batchId}` : undefined // 只在第一个文件添加说明
            };
        }));

        // 构建FormData
        const telegramFormData = new FormData();
        telegramFormData.append('chat_id', env.TG_Chat_ID);
        telegramFormData.append('media', JSON.stringify(media));
        
        // 添加文件
        files.forEach((file, index) => {
            telegramFormData.append(`file${index}`, file);
        });

        // 调用Telegram API
        const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/sendMediaGroup`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: telegramFormData
        });

        const responseData = await response.json();

        if (response.ok) {
            return { success: true, data: responseData };
        } else {
            console.error('Telegram API error:', responseData);
            return {
                success: false,
                error: responseData.description || 'Failed to upload to Telegram'
            };
        }

    } catch (error) {
        console.error('Network error in sendMediaGroupToTelegram:', error);
        return {
            success: false,
            error: 'Network error occurred during upload'
        };
    }
}

/**
 * 重试机制包装器
 * @param {Function} fn - 要重试的函数
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise} 函数执行结果
 */
export async function withRetry(fn, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries) {
                // 指数退避策略
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
    }
    
    throw lastError;
}
