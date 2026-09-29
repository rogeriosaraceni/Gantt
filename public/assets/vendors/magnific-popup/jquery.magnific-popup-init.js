$(document).ready(function() {
    // Aplicamos ao 'body' para capturar cliques em qualquer lugar da página
    $('body').magnificPopup({
        delegate: '[data-popup="iframe"]', // O alvo do clique
        type: 'iframe',
        preloader: true,
        removalDelay: 450,
        mainClass: 'mfp-fade',

        iframe: {
            markup: '<div class="mfp-iframe-scaler">' +
                    '<div class="mfp-close"></div>' +
                    '<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>' +
                    '</div>'
        },
        callbacks: {
            elementParse: function(item) {
                // Suporta <a> (href) e <button> (data-src)
                if(item.el.is('button')) {
                    item.src = item.el.attr('data-src');
                } else {
                    item.src = item.el.attr('href');
                }
            },
            
            open: function() {
                var $el = this.st.el; 
                var $content = this.wrap.find('.mfp-content'); 
                var $scaler = this.wrap.find('.mfp-iframe-scaler'); 

                var w = $el.data('width') || 800;
                var h = $el.data('height') || 600;

                if ($.isNumeric(w)) w = w + 'px';
                if ($.isNumeric(h)) h = h + 'px';

                $content.css('max-width', w);
                $scaler.css({
                    'height': h,
                });
                
                $content.css('height', h);
            }
        }
    });
});