// 批量上传功能注入脚本
// 这个脚本会在主页面加载后自动添加批量上传链接

(function() {
    'use strict';
    
    // 等待页面加载完成
    function addBatchUploadLink() {
        // 查找合适的位置插入批量上传链接
        const container = document.querySelector('.main') || document.querySelector('.container') || document.body;
        
        if (!container) {
            console.log('未找到合适的容器，稍后重试...');
            setTimeout(addBatchUploadLink, 1000);
            return;
        }
        
        // 检查是否已经添加过链接
        if (document.getElementById('batch-upload-link')) {
            return;
        }
        
        // 创建批量上传链接
        const linkContainer = document.createElement('div');
        linkContainer.id = 'batch-upload-link';
        linkContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        `;
        
        const link = document.createElement('a');
        link.href = '/batch-upload.html';
        link.textContent = '批量上传';
        link.style.cssText = `
            display: inline-block;
            padding: 10px 20px;
            background: rgba(64, 158, 255, 0.9);
            color: white;
            text-decoration: none;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        // 悬停效果
        link.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(64, 158, 255, 1)';
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(64, 158, 255, 0.9)';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        });
        
        linkContainer.appendChild(link);
        document.body.appendChild(linkContainer);
        
        console.log('批量上传链接已添加');
    }
    
    // 页面加载完成后添加链接
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addBatchUploadLink);
    } else {
        addBatchUploadLink();
    }
    
    // 为了确保在SPA环境下也能正常工作，设置一个备用定时器
    setTimeout(addBatchUploadLink, 2000);
})();
