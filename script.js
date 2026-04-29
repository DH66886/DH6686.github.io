// 存储数据的key
const STORAGE_KEY = 'invite_feedback_data';
let currentRating = 0;

// ========== 星星评分功能 ==========
function initStars() {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.dataset.rating);
            updateStars();
        });
    });
}

function updateStars() {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < currentRating) {
            star.textContent = '★';
            star.classList.add('active');
        } else {
            star.textContent = '☆';
            star.classList.remove('active');
        }
    });
}

// ========== 数据操作 ==========
function getFeedbacks() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveFeedback(feedback) {
    const feedbacks = getFeedbacks();
    feedback.id = Date.now();
    feedback.timestamp = new Date().toLocaleString('zh-CN');
    feedbacks.unshift(feedback);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
}

function deleteFeedback(id) {
    let feedbacks = getFeedbacks();
    feedbacks = feedbacks.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
    renderAdminPanel();
}

function clearAllFeedbacks() {
    if (confirm('⚠️ 确定要删除所有反馈吗？此操作不可恢复！')) {
        localStorage.removeItem(STORAGE_KEY);
        renderAdminPanel();
        showMessage('已清空所有反馈', 'success');
    }
}

// ========== 导出CSV ==========
function exportToCSV() {
    const feedbacks = getFeedbacks();
    if (feedbacks.length === 0) {
        showMessage('暂无数据可导出', 'error');
        return;
    }
    
    // CSV表头
    const headers = ['ID', '时间', '昵称', '邮箱', '评分', '建议内容'];
    const rows = [headers];
    
    feedbacks.forEach(f => {
        rows.push([
            f.id,
            f.timestamp,
            f.name || '',
            f.email || '',
            f.rating || '',
            f.suggestion
        ]);
    });
    
    // 转换为CSV字符串
    const csvContent = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // 下载文件
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `feedback_${new Date().toISOString().slice(0, 19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage('导出成功！', 'success');
}

// ========== 渲染管理面板 ==========
function renderAdminPanel() {
    const feedbacks = getFeedbacks();
    const feedbackListDiv = document.getElementById('feedbackList');
    const statsDiv = document.getElementById('stats');
    
    // 统计数据
    const total = feedbacks.length;
    const ratingsWithValue = feedbacks.filter(f => f.rating > 0);
    const avgRating = ratingsWithValue.length > 0 
        ? ratingsWithValue.reduce((sum, f) => sum + f.rating, 0) / ratingsWithValue.length 
        : 0;
    const validSuggestions = feedbacks.filter(f => f.suggestion.length > 10).length;
    
    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${total}</div>
            <div class="stat-label">总反馈数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${avgRating.toFixed(1)}</div>
            <div class="stat-label">平均评分</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${validSuggestions}</div>
            <div class="stat-label">有效建议</div>
        </div>
    `;
    
    if (feedbacks.length === 0) {
        feedbackListDiv.innerHTML = '<p style="text-align:center;color:#999;">暂无反馈数据</p>';
        return;
    }
    
    feedbackListDiv.innerHTML = feedbacks.map(f => `
        <div class="feedback-item">
            <div class="feedback-header">
                <span>📅 ${f.timestamp}</span>
                <button class="btn-small delete-btn" onclick="deleteFeedback(${f.id})">🗑️ 删除</button>
            </div>
            <div>
                <strong>${escapeHtml(f.name || '匿名用户')}</strong>
                ${f.email ? `(<a href="mailto:${f.email}">${escapeHtml(f.email)}</a>)` : ''}
            </div>
            <div class="feedback-rating">${'★'.repeat(f.rating || 0)}${'☆'.repeat(5 - (f.rating || 0))}</div>
            <div class="feedback-content">${escapeHtml(f.suggestion)}</div>
        </div>
    `).join('');
}

// 防XSS攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 显示消息 ==========
function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// ========== 提交反馈 ==========
function initFormSubmit() {
    const form = document.getElementById('feedbackForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const suggestion = document.getElementById('suggestion').value.trim();
        if (!suggestion) {
            showMessage('请填写你的建议或反馈内容', 'error');
            return;
        }
        
        const feedback = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            rating: currentRating,
            suggestion: suggestion
        };
        
        saveFeedback(feedback);
        
        // 清空表单
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('suggestion').value = '';
        currentRating = 0;
        updateStars();
        
        showMessage('🎉 感谢你的反馈！我们会认真对待每一条建议。', 'success');
        
        // 如果管理面板开着，刷新它
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel && adminPanel.style.display === 'block') {
            renderAdminPanel();
        }
    });
}

// ========== 管理面板开关 ==========
let adminUnlocked = false;

function initAdminPanel() {
    const toggleBtn = document.getElementById('toggleAdminBtn');
    if (!toggleBtn) return;
    
    toggleBtn.addEventListener('click', function() {
        if (!adminUnlocked) {
            const pwd = prompt('请输入管理密码：');
            if (pwd === 'admin123') {
                adminUnlocked = true;
                const panel = document.getElementById('adminPanel');
                panel.style.display = 'block';
                renderAdminPanel();
                this.textContent = '🔒 关闭管理面板';
            } else {
                alert('密码错误！');
            }
        } else {
            adminUnlocked = false;
            document.getElementById('adminPanel').style.display = 'none';
            this.textContent = '🔐 管理反馈';
        }
    });
}

// ========== 初始化所有功能 ==========
function init() {
    initStars();
    initFormSubmit();
    initAdminPanel();
    
    // 绑定按钮事件
    const exportBtn = document.getElementById('exportBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllFeedbacks);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', init);