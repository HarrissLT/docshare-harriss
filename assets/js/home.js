// assets/js/home.js

const docList = document.getElementById('docList');

// Hàm tính thời gian
const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
};

async function fetchDocuments() {
    console.log("Đang tải tài liệu..."); // Kiểm tra xem hàm có chạy không

    // Lấy dữ liệu từ Supabase
    const { data: documents, error } = await window.supabaseClient
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

    // 1. Nếu có lỗi từ Supabase
    if (error) {
        console.error("Lỗi Supabase:", error);
        docList.innerHTML = `<p style="color: red; text-align: center;">Lỗi tải dữ liệu: ${error.message}</p>`;
        return;
    }

    // 2. Nếu không có lỗi nhưng không có bài nào
    if (!documents || documents.length === 0) {
        console.log("Không tìm thấy tài liệu nào trong Database.");
        docList.innerHTML = `<div style="text-align:center; grid-column: 1/-1;">
                                <p>Chưa có tài liệu nào.</p>
                                <p>Hãy vào trang Admin để đăng bài đầu tiên!</p>
                             </div>`;
        return;
    }

    // 3. Nếu có dữ liệu -> Render ra màn hình
    console.log("Tìm thấy:", documents.length, "tài liệu.");
    docList.innerHTML = '';

    documents.forEach(doc => {
        // Xử lý ảnh (Nếu lỗi link ảnh thì dùng ảnh mặc định)
        const thumb = doc.thumbnail_url || 'https://placehold.co/300x200?text=No+Image';
        
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <div class="card-thumb">
                ${doc.price === 0 ? '<span class="tag free">Miễn phí</span>' : '<span class="tag premium">Premium</span>'}
                <img src="${thumb}" alt="${doc.title}" style="width:100%; height:100%; object-fit:cover;">
                <div class="overlay">
                    <a href="detail.html?id=${doc.id}" class="btn-icon" style="display:flex;align-items:center;justify-content:center;text-decoration:none">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
            </div>
            <div class="card-body">
                <div class="cat-date">
                    <span class="category">${doc.category || 'Tài liệu'}</span>
                    <span class="date">${timeAgo(doc.created_at)}</span>
                </div>
                <h3 class="doc-title">
                    <a href="detail.html?id=${doc.id}" style="color:inherit">${doc.title}</a>
                </h3>
                <div class="card-footer">
                    <div class="price">${doc.price === 0 ? 'Free' : new Intl.NumberFormat('vi-VN').format(doc.price) + 'đ'}</div>
                    <div class="downloads"><i class="fas fa-download"></i> ${doc.downloads || 0}</div>
                </div>
            </div>
        `;
        docList.appendChild(card);
    });
}

fetchDocuments();