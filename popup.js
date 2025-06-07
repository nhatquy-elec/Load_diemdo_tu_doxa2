const selectPointBtn = document.getElementById('selectPointBtn');
const runScriptBtn = document.getElementById('runScriptBtn');
const infoDiv = document.getElementById('info');

function updateInfo(x, y) {
  infoDiv.textContent = `Tọa độ đã lưu: x = ${x}, y = ${y}`;
}

// Lấy tọa độ đã lưu trong storage và cập nhật giao diện
chrome.storage.local.get(['clickX', 'clickY'], ({ clickX, clickY }) => {
  if (clickX !== undefined && clickY !== undefined) {
    updateInfo(clickX, clickY);
  }
});

// Khi nhấn nút chọn tọa độ, inject code để lắng nghe Shift+Click trên tab hiện tại
selectPointBtn.onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      function clickListener(e) {
        if (e.shiftKey) {
          e.preventDefault();
          const x = e.clientX;
          const y = e.clientY;
          console.clear();
          console.log(`🖱️ Tọa độ đã chọn: x = ${x}, y = ${y}`);
          window._savedClickPoint = { x, y };
          chrome.storage.local.set({ clickX: x, clickY: y });
          alert(`Đã lưu tọa độ: x=${x}, y=${y}`);
          document.removeEventListener('click', clickListener, true);
        }
      }
      document.addEventListener('click', clickListener, true);
      alert('Hãy Shift + Click vào vị trí bạn muốn lưu tọa độ click!');
    }
  });
};

// Khi nhấn nút chạy script, inject script tự động với tọa độ đã lưu
runScriptBtn.onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.storage.local.get(['clickX', 'clickY'], ({ clickX, clickY }) => {
    if (clickX === undefined || clickY === undefined) {
      alert('⚠️ Chưa chọn tọa độ! Vui lòng chọn trước khi chạy.');
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (x, y) => {
        window._savedClickPoint = { x, y };

        (async () => {
          function clickAtFixedPoint() {
            const point = window._savedClickPoint;
            if (!point) {
              console.warn('⚠️ Chưa có tọa độ. Hãy Shift + Click để lưu tọa độ trước.');
              return;
            }
            const { x, y } = point;
            const eventOptions = {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: x,
              clientY: y
            };
            const el = document.elementFromPoint(x, y);
            if (!el) {
              console.warn('❌ Không tìm thấy phần tử tại tọa độ:', x, y);
              return;
            }
            console.log(`🟢 Click vào phần tử tại (${x}, ${y}):`, el);
            el.dispatchEvent(new MouseEvent('mouseover', eventOptions));
            el.dispatchEvent(new MouseEvent('mousemove', eventOptions));
            el.dispatchEvent(new MouseEvent('mousedown', eventOptions));
            el.dispatchEvent(new MouseEvent('mouseup', eventOptions));
            el.dispatchEvent(new MouseEvent('click', eventOptions));
          }

          const values = [
            "CT0314131", "CT0302003", "CT0302004", "CT0317431", "CT0303005",
            "CT0308431", "CT0316431", "CT0318431", "CT0301004", "CT0305003",
            "CT0310431", "CT0303006", "CT0313432", "CT0312432", "CT0315432",
            "CT0306002", "CT0301432", "CT0305004", "CT0307003", "CT0310631", "CT0310632"
          ];

          const inputSelector = 'input.dx-texteditor-input';
          const resultsContainerSelector = '.dx-scrollview-content';
          const listItemSelector = '.dx-item.dx-list-item';

          async function fillAndDispatch(inputElement, value) {
            inputElement.value = value;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
          }

          async function waitForElement(selector, timeout = 3000, interval = 200) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
              const el = document.querySelector(selector);
              if (el) return el;
              await new Promise(res => setTimeout(res, interval));
            }
            return null;
          }

          async function clickFirstListItem() {
            const container = await waitForElement(resultsContainerSelector);
            if (!container) {
              console.error('❌ Không tìm thấy vùng kết quả.');
              return false;
            }
            const item = await waitForElement(`${resultsContainerSelector} ${listItemSelector}`, 3000);
            if (item) {
              console.log('🟢 Click vào kết quả đầu tiên:', item);
              item.click();
              await new Promise(res => setTimeout(res, 1000));
              return true;
            } else {
              console.warn('⚠️ Không có mục nào trong danh sách.');
              return false;
            }
          }

          const input = document.querySelector(inputSelector);
          if (!input) {
            console.error('❌ Không tìm thấy ô nhập.');
            return;
          }

          for (const value of values) {
            console.log(`\n🔸 Đang xử lý: ${value}`);
            await fillAndDispatch(input, value);
            await new Promise(res => setTimeout(res, 800));

            const clicked = await clickFirstListItem();
            if (clicked) {
              clickAtFixedPoint();
              await new Promise(res => setTimeout(res, 1500));
            } else {
              console.warn(`⚠️ Bỏ qua clickAtFixedPoint do không có kết quả cho: ${value}`);
            }
          }

          console.log('✅ Hoàn tất toàn bộ quá trình.');
        })();
      },
      args: [clickX, clickY]
    });
  });
};
