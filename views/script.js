$(document).ready(() => {

  //トップの動く文字
  const topMessage = $('.top-message');
  topMessage.addClass('fade-in-magic');
  topMessage.on('animationend', () => {
    topMessage.removeClass('fade-in-magic');
    console.log('success');
  });

  // ボタンをクリックした時のイベントリスナーを追加
  $('#confirmButton').on('click', (event) => {
    // フォームの送信をキャンセル
    event.preventDefault();

    // 確認モーダルを表示
    $('#confirmationModal').css('display', 'block');
  });

  // はいボタンをクリックした時のイベントリスナーを追加
  $('#yesButton').on('click', () => {
    // フォームを送信
    $('.dev-form').submit();
  });

  // いいえボタンをクリックした時のイベントリスナーを追加
  $('#noButton').on('click', () => {
    // 確認モーダルを非表示
    $('#confirmationModal').css('display', 'none');
  });


  //ログアウト確認モーダル
  const logoutButton = $('#logoutButton');
  const confirmationModal = $('#confirmationModal1');
  const confirmLogoutButton = $('#confirmLogout1');
  const cancelLogoutButton = $('#cancelLogout1');

  if (logoutButton && confirmationModal && confirmLogoutButton && cancelLogoutButton) {
    logoutButton.on('click', (event) => {
      event.preventDefault();
      confirmationModal.show();
    });

    confirmLogoutButton.on('click', () => {
      // ログアウト処理を実行
      window.location.href = '/logout'; // ログアウトするURLに置き換えてください
    });

    cancelLogoutButton.on('click', () => {
      confirmationModal.hide();
    });
  }

  //モーダル
  $('.deleteButton').on('click', (event) => {
    event.preventDefault();
    const articleId = $(event.currentTarget).data('article-id');
    console.log(articleId); 
    $('#confirmationModal2').css('display', 'block');

    console.log('confirmation');
  
    $('#confirmDeleteButton').on('click', () => {
      console.log('Delete button clicked'); // 追加したログ
      $.ajax({
        url: `/article/delete/${articleId}`,
        method: 'DELETE',
        success: (response) => {
          console.log('記事を削除しました', response);
          window.location.href = '/blog';
        },
        error: (error) => {
          console.error('記事の削除に失敗しました', error);
        }
      });
    });
    
  
    $('#cancelDeleteButton').on('click', () => {
      $('#confirmationModal2').css('display', 'none');
    });
  });
  

});



console.log("script.js is loaded");
