// assets/js/favorites.js

const favList = document.getElementById('favList');
const favCount = document.getElementById('favCount');

// 1. Hàm định dạng tiền
const formatPrice = (price) => {
    if (price === 0) return '<span class="tag free">Miễn phí</span>';
    return `<span class="tag premium">${new Intl.NumberFormat('vi-VN').format(price)}đ</span>`;
};

// 2. Hàm tải danh sách yêu thích
async function loadFavorites() {
    // A. Kiểm tra đăng nhập
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        alert("Vui lòng đăng nhập để xem tài liệu yêu thích!");
        window.location.href = "login.html";
        return;
    }

    // B. Lấy dữ liệu từ bảng favorites KẾT HỢP bảng documents
    // Cú pháp: select('id, documents(*)') nghĩa là lấy ID của dòng favorite và toàn bộ thông tin document tương ứng
    const { data: favorites, error } = await window.supabaseClient
        .from('favorites')
        .select('id, documents(*)') 
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        favList.innerHTML = `<p style="color:red; text-align:center">Lỗi tải dữ liệu: ${error.message}</p>`;
        return;
    }

    // C. Kiểm tra trống
    if (!favorites || favorites.length === 0) {
        favCount.textContent = "Chưa có tài liệu nào";
        favList.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1; padding: 50px;">
                <i class="far fa-heart" style="font-size: 4rem; color: #ddd; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 1.1rem;">Bạn chưa lưu tài liệu nào.</p>
                <a href="library.html" class="btn btn-primary" style="margin-top:20px;">Khám phá ngay</a>
            </div>`;
        return;
    }

    // D. Render ra màn hình
    favCount.textContent = `Bạn đã lưu ${favorites.length} tài liệu`;
    favList.innerHTML = '';

    favorites.forEach(item => {
        const doc = item.documents; // Lấy thông tin document từ object con
        
        // Nếu tài liệu gốc bị xóa thì bỏ qua
        if (!doc) return;

        const thumb = doc.thumbnail_url || 'https://placehold.co/300x200?text=No+Image';
        
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <div class="card-thumb">
                ${formatPrice(doc.price)}
                <img src="${thumb}" alt="${doc.title}">
                <div class="overlay">
                    <!-- Nút Xóa khỏi yêu thích -->
                    <button class="btn-icon" onclick="removeFavorite(${item.id})" title="Bỏ yêu thích" style="background: #fee2e2; color: #ef4444;">
                        <i class="fas fa-trash"></i>
                    </button>
                    <!-- Nút Xem chi tiết -->
                    <a href="detail.html?id=${doc.id}" class="btn-icon" style="display:flex;align-items:center;justify-content:center;text-decoration:none">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
            </div>
            <div class="card-body">
                <div class="cat-date">
                    <span class="category">${doc.category}</span>
                </div>
                <h3 class="doc-title">
                    <a href="detail.html?id=${doc.id}" style="color:inherit">${doc.title}</a>
                </h3>
                <div class="card-footer">
                    <div class="price">${doc.price === 0 ? 'Free' : new Intl.NumberFormat('vi-VN').format(doc.price) + 'đ'}</div>
                </div>
            </div>
        `;
        favList.appendChild(card);
    });
}

// 3. Hàm Xóa khỏi yêu thích
window.removeFavorite = async (favId) => {
    if (!confirm("Bạn muốn bỏ tài liệu này khỏi danh sách yêu thích?")) return;

    const { error } = await window.supabaseClient
        .from('favorites')
        .delete()
        .eq('id', favId);

    if (error) {
        alert("Lỗi: " + error.message);
    } else {
        // Load lại danh sách sau khi xóa
        loadFavorites();
    }
};

// Chạy khi load trang
loadFavorites();