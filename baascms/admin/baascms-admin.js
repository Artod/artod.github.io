/**
 * Admin panel BaasCMS
 * Copyright (c) 2014 Artod gartod@gmail.com
*/

;(function(window, document, _, $, BaasCMS, undefined) {
    if (!BaasCMS.inited) {
        console.warning('Need to initialize BaasCMS first.');
        return;
    }

    var widgetCategories = new BaasCMS.widgets.Categories({
        elementSelector: '#categories',
        afterRender: function() {
            var that = this;
            
            $('a[data-marker="delete"]', this.$el).on('click', function(e) {
                if (BaasCMS.adapter.busy) return false;
                
                var $this = $(this);
                
                if ( !confirm('All associated articles will be removed also. Are you sure?') ) {
                    return false;
                }
            
                var cid = $this.data('id');
                
                BaasCMS.adapter.delCategory(cid).done(function() {
                    widgetMain.load();                   
                
                    $('#category-' + cid).fadeOut(100, function() {
                        $(this).remove();
                    });
                }).fail(function(modelName, error) {
                    // reload categories and reload main widget
                });
                
                return false;
            });
        },
        onEnter: function(cid) { // TODO make sure widgets is inited 
            this.currentCID = cid;
        
            var that = this;            
            $(function() {
                that.$el.find('li').removeClass('active');
                ( cid && $('#category-' + cid).addClass('active') );
            });
        }
    });
    
    var getCategoryPattern = function(dataCategories, dataPatterns, noIncestWith) {
        var optionPatterns = [['', '']];
        _.each(dataPatterns, function(el){
            optionPatterns.push([el.name, el.name]);
        });

        var optionCategories = [['', '']],
            recurs = function(categories, parent_id, level) {
                _.each(categories, function(category) {
                    if (noIncestWith === category.id) {
                        return;
                    }
                    
                    optionCategories.push([category.id, _.str.repeat('&nbsp;&nbsp;&nbsp;&nbsp;', level) + category.name]);

                    var children = _.where(dataCategories, {parent_id: category.id});

                    if (children.length) {
                        recurs(children, category.id, level + 1);
                    }
                });
            };

        recurs( _.where(dataCategories, {parent_id: ''}), '', 0 );

        return [{
            name: 'name',
            type: 'text'
        }, {
            name: 'parent_id',
            type: 'select',
            options: optionCategories
        }, {
            name: 'pattern_name',
            type: 'select',
            options: optionPatterns
        }, {
            name: 'place',
            type: 'select',
            options: ['', 'menu', 'submenu', 'catalog', 'section']
        }, {
            name: 'icon',
            type: 'google drive image'
        }, {
            name: 'body',
            type: 'textarea'
        }];
    };

    var patternForm = function($form, onAdd) {
        var $add = $('#add-new-field'),
            $fields = $('#pattern-fields');

        $add.on('click', function() {
            $fields.append( _.template( $('#template-baascms-pattern-new-field').html(), {
                data: {},
                types: BaasCMS.cons.formFieldTypes
            } ) );

            return false;
        });

        $fields.on('click', 'a[data-marker="delete-field"]', function() {
            $(this).closest('div.form-group').fadeOut(100, function() {
                $(this).remove();
            });

            return false;
        });

        var selectorType = 'select[data-marker="field-type"]',
            selectorOptions = 'input[data-marker="field-options"]';

        $fields.on('change', selectorType, function() {
            var $this = $(this);

            $this.closest('div.row')
                .find(selectorOptions)
                .parent()[ $this.val() === 'select' ? 'removeClass' : 'addClass' ]('hidden');
        });

        $form.on('submit', function() {
            if (BaasCMS.adapter.busy) return false;
            
            var data = BaasCMS.utils.collectDataForm($form),
                hasError = false;
                
            $form.find('input').parent().removeClass('has-error');
            
            data.name = _.str.classify( data.name.replace(/^[0-9]/, 'P$&') );

            var $textName = $('#text-name');
            if ( /^[A-Z][a-zA-Z0-9]*$/.test(data.name) ) {
                $textName.val(data.name);
            } else {
                $textName.parent().addClass('has-error');
                hasError = true;
            }

            data.pattern = [];

            $fields.find('> div').each(function(i) {
                var $field = $(this),
                    $fieldName = $field.find('input[data-marker="field-name"]'),
                    name = _.str.underscored( $fieldName.val().replace(/^[0-9]/, 'f$&') ),
                    type = $field.find(selectorType).val(),
                    options = $field.find(selectorOptions).val();

                
                    
                if ( /^[a-z][a-z0-9_]*$/i.test(name) ) {
                    if ( _.contains(['id', 'category_id', 'acl'], name) ) {// reserved keys
                        name = name + '_1';
                    }
                
                    $fieldName.val(name);
                } else {
                    $fieldName.parent().addClass('has-error');
                    hasError = true;
                }

                data.pattern.push( _.extend({
                    name: name,
                    type: type
                }, (type === 'select' ? {
                    options: options
                } : {}) ) );
            });

            if (hasError) {
                return false;
            }

            if (data.id) { // edit
                BaasCMS.adapter.save('Pattern', data).done(function() {
                    onAdd();
                });                                    
            } else { // create
                BaasCMS.adapter.all('Pattern', {
                    withoutCache: true
                }).then(function(dataPatterns) { // create unique Pattern.name 
                    var indexedPatterns = _.indexBy(dataPatterns, 'name'),
                        newName = data.name,
                        i = 0;
                     
                    while (indexedPatterns[newName]) {
                        newName = data.name + i;
                        i++;
                    }
                    
                    data.name = newName;
                    
                    return BaasCMS.adapter.save('Pattern', data);
                }).done(function() {
                    onAdd();
                });
            }

            return false;
        });
    };
    
    var generateForm = function(dataOrPattern, pattern) {
        var data = pattern ? dataOrPattern : {},
            pattern = pattern ? pattern : dataOrPattern,
            template = _.template( $('#template-baascms-form-element').html() ),
            res = '';
            
        var onEach = function(field) {
            var id = 'form-element-'+ _.str.dasherize(field.type) + '-' +_.str.dasherize(field.name),
                value = (data[field.name] ? data[field.name] : '');                

            res += template({
                id: id,
                value: value,
                type: field.type,
                name: field.name,
                options: _.isString(field.options) ? field.options.split(';') : field.options
            });
        };
        
        if (data.id) {
            onEach({
                name: 'id',
                type: 'hidden'
            });
        }
        
        _.each(pattern, onEach);

        return res;
    };
    
    var widgetMain = new BaasCMS.widgets.Main({
        elementSelector: '#main',      
        category: {
            afterQuery: function(data) {
                var patternName = data.category.pattern_name,
                    cid = data.category.id;
                
                if (!patternName) {
                    return;
                }
                
                var that = this;
                
                widgetMain.opts.items[patternName] = widgetMain.opts.items[patternName] || {};        
                widgetMain.opts.items[patternName].afterRender = function() {
                    $('a[data-marker="delete"]', this.$el).on('click', function() {
                        if (BaasCMS.adapter.busy) return false;
                        
                        var iid = $(this).data('id');
                        
                        BaasCMS.adapter.delItem(patternName, iid, cid).done(function() {
                            widgetCategories.load();
                            
                            $('#item' + _.str.dasherize(patternName) + '-' + iid).fadeOut(100, function() {
                                $(this).remove();
                            });                            
                        });
                        
                        return false;
                    });
                };
            }
        },
        beforeHome: function() {  
            return BaasCMS.loadHomePage();
        },
        routes: {
            '#/baascms/category/add': function(params) {
                var that = this,
                    waitfor = this.startWaiting();
                
                $.when(
                    BaasCMS.adapter.all('Category', {
                        select: BaasCMS.cons.categoriesSelect
                    }),
                    BaasCMS.adapter.all('Pattern')
                ).done(function(dataCategories, dataPatterns) {
                    that.fill( waitfor, _.template( $('#template-baascms-form').html(), {
                        header: 'Add category',
                        button: 'Create',
                        form: generateForm( getCategoryPattern(dataCategories, dataPatterns) )
                    } ) );

                    var $form = that.$el.find('form');

                    $form.on('submit', function() {
                        if (BaasCMS.adapter.busy) return false;
                        
                        var data = BaasCMS.utils.collectDataForm($form);

                        BaasCMS.adapter.save('Category', data).done(function(cid) {
                            widgetCategories.load();           
                            window.location.hash = '/baascms/category/edit/' + cid;
                        });

                        return false;
                    });
                });
            },
            '#/baascms/category/edit/:cid': function(params) {
                var that = this,        
                    waitfor = this.startWaiting();
                
                $.when(
                    BaasCMS.adapter.getById('Category', params['cid'], {
                        withoutCache: true
                    }),
                    BaasCMS.adapter.all('Category', {
                        select: BaasCMS.cons.categoriesSelect
                    }),
                    BaasCMS.adapter.all('Pattern')
                ).done(function(dataCategory, dataCategories, dataPatterns) {
                    if (!dataCategory.id) {
                        that.fill(waitfor, 'Category was not found.');  
                        return;
                    }
                
                    that.fill(waitfor, _.template( $('#template-baascms-form').html(), {
                        header: 'Edit category',
                        button: 'Update',
                        form: generateForm( dataCategory, getCategoryPattern(dataCategories, dataPatterns, params['cid']) )
                    } ) );

                    var $form = that.$el.find('form');

                    $form.on('submit', function() {
                        if (BaasCMS.adapter.busy) return false;
                    
                        var data = BaasCMS.utils.collectDataForm($form);

                        BaasCMS.adapter.save('Category', data).done(function(cid) {
                            BaasCMS.message('Updated', 'success'); // otherwise it may not be clear                       
                            widgetCategories.load();
                        });

                        return false;
                    });
                });
            },
            '#/baascms/category/:cid/item/add': function(params) {
                var dataCategory,
                    cid = params['cid'],
                    that = this,
                    waitfor = this.startWaiting();
                
                BaasCMS.adapter.getById('Category', cid, {
                    withoutCache: true
                }).then(function(data) {
                    dataCategory = data;

                    if (!dataCategory.id) {
                        that.fill(waitfor, 'Such a category was not found.');                                              
                        return;
                    }
                    
                    return BaasCMS.adapter.first('Pattern', {
                        where: {name: dataCategory.pattern_name}
                    });
                }).done(function(dataPattern) {                                
                    if (!dataPattern) { // 'return' on prev step
                        return;
                    }
                    
                    if (!dataPattern.name) {
                        that.fill(waitfor, 'There are no pattern for this category.');
                        return;
                    }
                    
                    dataPattern.pattern.push({
                        name: 'category_id',
                        type: 'hidden'
                    });
                    
                    var template = $('#template-baascms' + _.str.dasherize(dataPattern.name) + '-form').html() || $('#template-baascms-form').html();
                    
                    that.fill( waitfor, _.template( template, {
                        header: 'Add ' + _.str.humanize(dataPattern.name),
                        button: 'Create',
                        form: generateForm({category_id: cid}, dataPattern.pattern)
                    } ) );
                    
                    var $form = that.$el.find('form');
                    
                    $form.on('submit', function() {
                        if (BaasCMS.adapter.busy) return false;
                        
                        var data = BaasCMS.utils.collectDataForm($form);

                        BaasCMS.adapter.save(dataPattern.name, data).then(function(iid) {
                            return BaasCMS.adapter.count(dataPattern.name, {
                                where: {
                                    category_id: cid
                                }
                            });
                        }).then(function(count) {
                            if ( _.isUndefined(count) ) { // can be 0
                                return;
                            }

                            return BaasCMS.adapter.save('Category', {
                                id: cid,
                                count: count
                            })
                        }).done(function() {
                            widgetCategories.load();                            
                            window.location.hash = '/baascms/category/' + cid;                            
                        });

                        return false;
                    });
                });
            },
            '#/baascms/category/:cid/item/edit/:iid': function(params) {
                var dataCategory,
                    cid = params['cid'],
                    iid = params['iid'],
                    that = this,
                    waitfor = this.startWaiting();
                    
                BaasCMS.adapter.getById('Category', cid, { // for pattern_name
                    select: ['pattern_name']
                }).then(function(data) {
                    dataCategory = data;
                    
                    if (!dataCategory.id) {
                        that.fill(waitfor, 'Such a category was not found.');
                        return;
                    }
                    
                    return $.when(
                        BaasCMS.adapter.all('Pattern'),
                        BaasCMS.adapter.getById(dataCategory.pattern_name, iid, {
                            withoutCache: true
                        })
                    );                                
                }).done(function(dataPatterns, dataItem) {
                    if (!dataPatterns || !dataItem) { // 'return;' on prev 'then'
                        return;
                    }
                    
                    var dataPattern = _.findWhere(dataPatterns, {name: dataCategory.pattern_name});
                    
                    if (!dataPattern.name) {
                        that.fill(waitfor, 'There are no pattern for this category.');
                        return;
                    }
                    
                    if (!dataItem.id) {
                        that.fill(waitfor, 'Item was not found.');
                        return;
                    }
                    
                    dataPattern.pattern.push({
                        name: 'category_id',
                        type: 'hidden'
                    });
                    
                    var template = _.str.trim( $('#template-baascms' + _.str.dasherize(dataPattern.name) + '-form').html() ) || $('#template-baascms-form').html();
                    
                    that.fill( waitfor, _.template(template, {
                        header: 'Edit ' + _.str.humanize(dataPattern.name),
                        button: 'Update',
                        form: generateForm(dataItem, dataPattern.pattern)
                    }) );
                    
                    var $form = that.$el.find('form');
                    $form.on('submit', function() {
                        if (BaasCMS.adapter.busy) return false;

                        var data = BaasCMS.utils.collectDataForm($form);

                        BaasCMS.adapter.save(dataPattern.name, data).done(function() {
                            window.location.hash = '/baascms/category/' + cid;
                        });

                        return false;
                    });
                });
            },
            '#/baascms/patterns': function(params) {
                var onDelete = function($this, e) {
                    var id = $this.data('id');

                    BaasCMS.adapter.del('Pattern', id).done(function() {
                        $('#pattern' + '-' + id).fadeOut(100, function() {
                            $(this).remove();
                        });
                    });
                };
                
                var that = this,                
                    waitfor = this.startWaiting();
                
                BaasCMS.adapter.all('Pattern', {
                    select: ['id', 'name'],
                    order: '-createdAt'
                }).done(function(data) {                
                    that.fill( waitfor, _.template( $('#template-baascms-patterns').html(), {
                        data: data
                    } ) );
                    
                    $('a[data-marker="delete"]', that.$el).on('click', function(e) {
                        if (BaasCMS.adapter.busy) return false;
                        
                        onDelete($(this), e);
                        
                        return false;
                    });                    
                });            
            },
            '#/baascms/pattern/add': function(params) {                
                this.$el.html( _.template( $('#template-baascms-pattern-form').html(), {
                    header: 'Add pattern',
                    button: 'Create',
                    data: {},
                    types: BaasCMS.cons.formFieldTypes
                } ) );                

                patternForm(this.$el.find('form'), function() {
                    window.location.hash = '/baascms/patterns';                 
                });
            },
            '#/baascms/pattern/edit/:id': function(params) {
                var that = this,
                    waitfor = this.startWaiting();
                    
                BaasCMS.adapter.getById('Pattern', params['id'], {
                    withoutCache: true
                }).done(function(data) {
                    that.fill( waitfor, _.template( $('#template-baascms-pattern-form').html(), {
                        header: 'Edit pattern',
                        button: 'Update',
                        data: data,
                        types: BaasCMS.cons.formFieldTypes
                    } ) );

                    patternForm(that.$el.find('form'), function() {
                        window.location.hash = '/baascms/patterns';
                    });
                });
            }
        }
    });

    $(function() {
        $(document).on('click', 'a[data-marker="google-drive-delete"]', function() {
            var $del = $(this),
                $context = $del.parent(),
                $input = $context.find('input:hidden'),                        
                $res = $context.find('[data-marker="google-drive-result"]');
            
            $input.val('');
            $del.hide();                    
            $res.hide();
            
            return false;
        });
        
        $(document).on('click', 'a[data-marker="gdrive-picker"]', function() {
            var $this = $(this);
            
            if ( $this.data('busy') ) {
                return false;
            }
            
            $this.data('busy', 1);        
            
            var type = $this.data('type');

            var picker = new FilePicker({
                apiKey: 'AIzaSyB-eOMMlzO0Wet2KL8r3qbKEhdLw4ORYe0',
                clientId: '802148819674-63aj228ta4fgssfst74shhcg9n91uvrb',
                type: type,
                onPickerApiLoaded: function() {
                    $this.data('busy', 0);
                },
                onSelect: function(file) {
                    if (!file.shared) {
                        alert('Do not forget to share this file on Google Drive!');
                    }
                    
                    var $context = $this.parent(),
                        $input = $context.find('input:hidden'),
                        $del = $context.find('a[data-marker="google-drive-delete"]'),
                        $res = $context.find('[data-marker="google-drive-result"]'),
                        link = '//drive.google.com/uc?export=view&id=' + file.id;
                    
                    $input.val(link);
                    $del.show();
                    
                    if (type === 'img') {
                        $res.find('img').attr('src', link);
                    }
                    
                    $res.show().attr('href', link );
                }
            });

            picker.open();
            
            return false;
        });
    });
    
})(window, document, window._, window.jQuery, window.BaasCMS);


/**!
 * Google Drive File Picker Example
 * By Daniel Lo Nigro (http://dan.cx/)
 */
;(function() {
    /**
     * Initialise a Google Driver file picker
     */
     
    var _driveIsLoaded = false,
        _pickerIsLoaded = false;
    
    var FilePicker = window.FilePicker = function(options) {
        // Config
        this.apiKey = options.apiKey;
        this.clientId = options.clientId;
        
        // Events
        this.onSelect = options.onSelect;
        this.onPickerApiLoaded = options.onPickerApiLoaded;    
        this.type = options.type;        

        // Load the drive API
        if (!_driveIsLoaded) {
            gapi.client.setApiKey(this.apiKey);
            gapi.client.load('drive', 'v2', this._driveApiLoaded.bind(this));
        }
        
        if (!_pickerIsLoaded) {
            google.load('picker', '1', { callback: this._pickerApiLoaded.bind(this) });
        } else {
            this.onPickerApiLoaded();
        }
    }

    FilePicker.prototype = {
        /**
         * Open the file picker.
         */
        open: function() {        
            // Check if the user has already authenticated
            var token = gapi.auth.getToken();
            if (token) {
                this._showPicker();
            } else {
                // The user has not yet authenticated with Google
                // We need to do the authentication before displaying the Drive picker.
                this._doAuth(false, function() { this._showPicker(); }.bind(this));
            }
        },
        
        /**
         * Show the file picker once authentication has been done.
         * @private
         */
        _showPicker: function() {
            var accessToken = gapi.auth.getToken().access_token;
            this.picker = new google.picker.PickerBuilder().            
                addView(google.picker.ViewId.FOLDERS);

            if (this.type === 'img') {
                var view = new google.picker.View(google.picker.ViewId.DOCS_IMAGES);
                view.setMimeTypes('image/png,image/jpeg,image/jpg,image/gif');
                this.picker.addView(view);                
            } else {
                this.picker.addView(google.picker.ViewId.DOCS).
                    addView(google.picker.ViewId.DOCS_IMAGES);
            }
                
            this.picker.setAppId(this.clientId).
                setOAuthToken(accessToken).
                setCallback(this._pickerCallback.bind(this)).
                build().
                setVisible(true);
        },
        
        /**
         * Called when a file has been selected in the Google Drive file picker.
         * @private
         */
        _pickerCallback: function(data) {
            if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                var file = data[google.picker.Response.DOCUMENTS][0],
                    id = file[google.picker.Document.ID],
                    request = gapi.client.drive.files.get({
                        fileId: id
                    });
                    
                request.execute(this._fileGetCallback.bind(this));
            }
        },
        /**
         * Called when file details have been retrieved from Google Drive.
         * @private
         */
        _fileGetCallback: function(file) {
            if (this.onSelect) {
                this.onSelect(file);
            }
        },
        
        /**
         * Called when the Google Drive file picker API has finished loading.
         * @private
         */
        _pickerApiLoaded: function() {
            _pickerIsLoaded = true;
            this.onPickerApiLoaded();
        },
        
        /**
         * Called when the Google Drive API has finished loading.
         * @private
         */
        _driveApiLoaded: function() {
            _driveIsLoaded = true;
            this._doAuth(true);
        },
        
        /**
         * Authenticate with Google Drive via the Google JavaScript API.
         * @private
         */
        _doAuth: function(immediate, callback) {    
            gapi.auth.authorize({
                client_id: this.clientId + '.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                immediate: immediate
            }, callback);
        }
    };
}());
			                       

