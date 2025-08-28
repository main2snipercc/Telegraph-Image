import { errorHandling, telemetryData } from "./utils/middleware";
import { sendMediaGroupToTelegram, validateFiles, createBatchId } from "./utils/telegram-batch";

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        await errorHandling(context);
        telemetryData(context);

        // 获取所有上传的文件
        const files = formData.getAll('files');
        
        if (!files || files.length === 0) {
            throw new Error('No files uploaded');
        }

        // 验证文件数量和类型
        const validation = validateFiles(files);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // 创建批次ID用于追踪
        const batchId = createBatchId();

        // 调用Telegram sendMediaGroup API
        const result = await sendMediaGroupToTelegram(files, env, batchId);

        if (!result.success) {
            throw new Error(result.error);
        }

        // 并发写入KV存储
        const kvPromises = result.data.result.map(async (messageResult, index) => {
            const file = files[index];
            const fileId = getFileId(messageResult);
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (env.img_url && fileId) {
                await env.img_url.put(`${fileId}.${fileExtension}`, "", {
                    metadata: {
                        TimeStamp: Date.now(),
                        ListType: "None",
                        Label: "None",
                        liked: false,
                        fileName: file.name,
                        fileSize: file.size,
                        batchId: batchId // 批次标识
                    }
                });
            }
            
            return {
                src: `/file/${fileId}.${fileExtension}`,
                fileName: file.name,
                fileSize: file.size
            };
        });

        const uploadResults = await Promise.all(kvPromises);

        return new Response(
            JSON.stringify(uploadResults),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Batch upload error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

function getFileId(messageResult) {
    if (!messageResult) return null;

    // 处理图片
    if (messageResult.photo) {
        return messageResult.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    
    // 处理视频
    if (messageResult.video) return messageResult.video.file_id;
    
    // 处理文档
    if (messageResult.document) return messageResult.document.file_id;
    
    // 处理音频
    if (messageResult.audio) return messageResult.audio.file_id;

    return null;
}
