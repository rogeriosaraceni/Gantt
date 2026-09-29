(function ($) {
    const _store = new WeakMap();

    const _defaults = {
        maxSize: null,           // bytes — override via options ou data-file-bite
        extensions: null,        // string — override via options ou data-file-extensions
        messages: {
            invalidExtension : (ext, file)  => `File "${file}" not allowed. Allowed: ${ext}`,
            maxSizeExceeded  : (mb)         => `Total size exceeds the maximum of ${mb} MB`,
            selected         : (n)          => `${n} file(s) selected`,
        }
    };

    function _getInput(wrapper) {
        return wrapper.find('input[type="file"]')[0];
    }

    function _updateUI(wrapper, files) {
        const input = _getInput(wrapper);
        const $span = wrapper.find('[data-anexo="name"]');
        const $btn  = wrapper.find('[data-target]');

        // Se input não é hidden, deixa o browser cuidar do texto
        if (!$(input).is('[hidden]')) {
            if (files.length === 0) $btn.hide();
            else $btn.show();
            return;
        }

        if (files.length === 0) {
            $span.text('');
            $btn.hide();
        } else {
            const msg = wrapper.data('plugin_jqueryRulesFileInput').options.messages.selected;
            $span.text(msg(files.length));
            $btn.show();
        }
    }

    function _validate(wrapper, input, newFiles) {
        const opts       = wrapper.data('plugin_jqueryRulesFileInput').options;
        const bite       = opts.maxSize       || parseInt(input.dataset.fileBite, 10)       || null;
        const extText    = opts.extensions    || input.dataset.fileExtensions                || '';
        const extensions = extText
            ? new RegExp(`(${extText.split(', ').join('|')})$`, 'i')
            : null;

        const isMultiple = input.multiple;
        const existing   = isMultiple ? (_store.get(input) || []) : [];

        // Sem novos arquivos — restaura
        if (!newFiles || newFiles.length === 0) {
            const dt = new DataTransfer();
            existing.forEach(f => dt.items.add(f));
            input.files = dt.files;
            return;
        }

        const existingNames = new Set(existing.map(f => f.name + f.size));
        const toAdd = [];

        for (const file of newFiles) {
            if (existingNames.has(file.name + file.size)) continue;

            if (extensions && !extensions.test(file.name)) {
                alert(opts.messages.invalidExtension(extText, file.name));
                continue;
            }

            toAdd.push(file);
        }

        const merged = [...existing, ...toAdd];

        // Valida tamanho total
        if (bite) {
            const totalSize = merged.reduce((acc, f) => acc + f.size, 0);
            if (totalSize > bite) {
                const maxMB = (bite / (1024 * 1024)).toFixed(0);
                alert(opts.messages.maxSizeExceeded(maxMB));
                return;
            }
        }

        _store.set(input, merged);

        if (opts.debug) console.log('Accumulated files:', merged.map(f => f.name));

        const dt = new DataTransfer();
        merged.forEach(f => dt.items.add(f));
        input.files = dt.files;

        _updateUI(wrapper, merged);
    }

    function _reset(wrapper) {
        const input = _getInput(wrapper);
        _store.delete(input);
        input.value = '';
        _updateUI(wrapper, []);
    }

    $.fn.jqueryRulesFileInput = function (options) {
        return this.each(function () {
            const $wrapper = $(this);

            if ($wrapper.data('plugin_jqueryRulesFileInput')) return;

            const opts = $.extend(true, {}, _defaults, options);
            $wrapper.data('plugin_jqueryRulesFileInput', { options: opts });

            const input = _getInput($wrapper);

            // Bind change
            $(input).on('change', function () {
                _validate($wrapper, input, input.files);
            });

            // Bind reset
            $wrapper.find('[data-target]').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                _reset($wrapper);
            });

            // Remove onchange/onclick inline do HTML (evita duplo disparo)
            input.removeAttribute('onchange');
            $wrapper.find('[data-target]').each(function () {
                this.removeAttribute('onclick');
            });
        });
    };
}(jQuery));
