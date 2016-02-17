/*
Style options based on:
- path: http://leafletjs.com/reference.html#path-options
- icon: http://leafletjs.com/reference.html#icon

Markers from:
- Maki Markers from mapbox: https://www.mapbox.com/maki/
*/

L.StyleForms = L.Class.extend({
    options: {
        currentMarkerStyle: {
            size: 'm',
            color: '48a'
        }
    },

    initialize: function(options) {
        L.setOptions(this, options);
    },

    clearForm: function() {
        this.options.styleEditorUi.innerHTML = '';
    },

    createGeometryForm: function() {
        this.clearForm();

        this.createColor();
        if (this.options.styleFormOptions.showEditStrokeOpacity) {
            this.createOpacity();
        }
        if (this.options.styleFormOptions.showEditLinewidth) {
            this.createLineWidth();
        }
        if (this.options.styleFormOptions.showEditStroke) {
            this.createStroke();
        }

        // Polygons, Circles get the fill options (TODO: how should we handle groups here?)
        var t = this.options.currentElement.target;
        if (t instanceof L.Polygon || t instanceof L.LayerGroup) {
            this.createFillColor();
            if (this.options.styleFormOptions.showEditFillOpacity) {
                this.createFillOpacity();
            }
        }
    },

    isTextMarker : function () {
         return this.options.currentElement.target.feature 
             && this.options.currentElement.target.feature.properties 
             && this.options.currentElement.target.feature.properties.text;

    },

    isRectangleMarker : function () {
         return this.options.currentElement.target.feature 
             && this.options.currentElement.target.feature.properties 
             && this.options.currentElement.target.feature.properties.rectangle;
    },

    isEllipseMarker : function () {
         return this.options.currentElement.target.feature 
             && this.options.currentElement.target.feature.properties 
             && this.options.currentElement.target.feature.properties.ellipse;
    },

    hasProperty : function (property) {
         return this.options.currentElement.target.feature 
             && this.options.currentElement.target.feature.properties 
             && this.options.currentElement.target.feature.properties[property];
    },

    isSpecialMarker : function () {
         return this.isTextMarker() || this.isRectangleMarker() || this.isEllipseMarker();

    },

    createMetaForm: function() {
        this.clearForm();
        var layer = this.options.currentElement.target;
        var meta = layer.meta;
        var updateFunctions = [];

        if (!meta) {
            console.log('Layer does not contain a meta object!', layer);
            throw 'Layer does not contain a meta object!';
        }

        for(var prop in meta) {
            var metaProp = meta[prop];
            if (metaProp.displayName) {
                var existingValue = layer.feature.properties[metaProp.name];
                var type = metaProp.type.typeName;

                var control;

                var changed = function(metaProp, updateFunctions, newValue){
                    console.log('changed Ahaha', metaProp.name, newValue);
                    var previousValue = layer.feature.properties[metaProp.name];
                    layer.feature.properties[metaProp.name] = newValue;

                    if (meta.changed) {
                        meta.changed(layer, metaProp, previousValue, newValue);
                    }
                    // After we have any change we move every value from the model to the controls again, so that
                    // during a change CB, we can change the model.
                    updateFunctions.forEach(function(curFunc){
                        curFunc();
                    });
                    var currentElement = this.options.currentElement.target;
                    this.fireChangeEvent(currentElement);
                }.bind(this, metaProp, updateFunctions);

                var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
                label.innerHTML = metaProp.displayName;

                if (type === 'color') {
                    control = this.createColorPicker(this.options.styleEditorUi, 
                       function(changed, e){
                           changed(this.rgbToHex(e.target.style.backgroundColor));
                       }.bind(this, changed)
                    );
                }
                else if (type === 'number') {
                    control = this.createNumberInput(this.options.styleEditorUi,
                        function(changed, e){
                            changed(e.target.value);
                        }.bind(this, changed)
                        , existingValue, 0, metaProp.type.maxValue, metaProp.type.incValue);
                } else if (type === 'boolean') {
                    control = this.createBooleanInput(this.options.styleEditorUi,
                        function(changed, e){
                            changed(e.target.checked);
                        }.bind(this, changed)
                        , existingValue);
                } else if (type === 'string') {
                    if (metaProp.type.allowedValues) {
                        control = this.createSelectInput(this.options.styleEditorUi, 
                            function(changed, e) {
                                console.log('changed select', e);
                                changed(e.srcElement.value);
                            }.bind(this, changed), metaProp.type.allowedValues, existingValue);
                    } else{
                        control = this.createTextInput(this.options.styleEditorUi,
                            function(changed, e) {
                                changed(e.target.value);
                            }.bind(this,changed), existingValue);
                    }
                }

                // If the control support updating its value:
                if (control && control.updateValue) {
                    updateFunctions.push(function(layer, metaProp, updateFunction){
                        var newValue = layer.feature.properties[metaProp.name];
                        updateFunction(newValue);
                    }.bind(this, layer, metaProp, control.updateValue));
                }
            }
        }
    },

    createMarkerForm: function() {
        this.clearForm();
        var textMarker = this.isTextMarker();
        if (textMarker) {
            this.createTextEdit();
        }

        if (!this.isSpecialMarker()) {
            this.createIconUrl();
        } else{
            this.createSpecialMarkerType();
        }



        this.createMarkerColor();

        if (this.hasProperty('size')) {
            this.createNumericPropertyChange('Size:', 'size', 0, 500, 10);
        } else{
            if (!textMarker) {
                this.createMarkerSize();
            }
        }
    },

    setNewMarker: function() {
        var markerStyle = this.options.currentMarkerStyle;

        if (markerStyle.size && markerStyle.icon && markerStyle.color) {
            var iconSize;
            switch (markerStyle.size) {
                case 's':
                    iconSize = [20, 50];
                    break;
                case 'm':
                    iconSize = [30, 70];
                    break;
                case 'l':
                    iconSize = [35, 90];
                    break;
            }

            var newIcon = new L.Icon({
                iconUrl: this.options.markerApi + 'pin-' + markerStyle.size + '-' + markerStyle.icon + '+' + markerStyle.color + '.png',
                iconSize: iconSize
            });
            var currentElement = this.options.currentElement.target;
            currentElement.setIcon(newIcon);
            this.fireChangeEvent(currentElement);
        }
        else{
            var currentElement = this.options.currentElement.target;
            this.fireChangeEvent(currentElement);
        }
    },

    createIconUrl: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Icon:';

        this.createSelectInput(this.options.styleEditorUi, function(e) {
            var value = e.target.value;
            this.options.currentMarkerStyle.icon = value;
            this.setNewMarker();
        }.bind(this), this.options.markers);
    },

    createSpecialMarkerType: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Type:';

        var currentValue = 'Square';
        if (this.options.currentElement.target.feature.properties && 
            this.options.currentElement.target.feature.properties.ellipse) {
            currentValue = 'Ellipse';
        }
        this.createSelectInput(this.options.styleEditorUi, function(e) {
            var value = e.target.value;
            var layer = this.options.currentElement.target;
            if (value === 'Circle') {
                layer.feature.properties.rectangle = null;
                layer.feature.properties.ellipse = true;
            }
            else  {
                layer.feature.properties.rectangle = true;
                layer.feature.properties.ellipse = null;
            }
            this.setNewMarker();
        }.bind(this), ['Circle', 'Square'], currentValue);
    },

    createMarkerColor: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Color:';

        this.createColorPicker(this.options.styleEditorUi, function(e) {
            var color = this.rgbToHex(e.target.style.backgroundColor);
            this.options.currentMarkerStyle.color = color.replace("#", "");
            if (!this.options.currentElement.target.feature) {
                this.options.currentElement.target.feature = {};
            }
            if (!this.options.currentElement.target.feature.properties) {
                this.options.currentElement.target.feature.properties = {};
            }
            this.options.currentElement.target.feature.properties.color = color;
            this.setNewMarker();
        }.bind(this));
    },

    createMarkerSize: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Size:';

        var s = L.DomUtil.create('div', 'leaflet-styleeditor-sizeicon sizeicon-small', this.options.styleEditorUi);
        var m = L.DomUtil.create('div', 'leaflet-styleeditor-sizeicon sizeicon-medium', this.options.styleEditorUi);
        var l = L.DomUtil.create('div', 'leaflet-styleeditor-sizeicon sizeicon-large', this.options.styleEditorUi);

        L.DomEvent.addListener(s, 'click', function() {
            this.options.currentMarkerStyle.size = 's';
            this.setNewMarker();
        }, this);

        L.DomEvent.addListener(m, 'click', function() {
            this.options.currentMarkerStyle.size = 'm';
            this.setNewMarker();
        }, this);

        L.DomEvent.addListener(l, 'click', function() {
            this.options.currentMarkerStyle.size = 'l';
            this.setNewMarker();
        }, this);
    },

    createColor: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Color:';

        this.createColorPicker(this.options.styleEditorUi, function(e) {
            var color = this.rgbToHex(e.target.style.backgroundColor);
            this.setStyle('color', color);
        }.bind(this));
    },

    createStroke: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Line Stroke:';

        var stroke1 = L.DomUtil.create('div', 'leaflet-styleeditor-stroke', this.options.styleEditorUi);
        stroke1.style.backgroundPosition = "0px -75px";

        var stroke2 = L.DomUtil.create('div', 'leaflet-styleeditor-stroke', this.options.styleEditorUi);
        stroke2.style.backgroundPosition = "0px -95px";

        var stroke3 = L.DomUtil.create('div', 'leaflet-styleeditor-stroke', this.options.styleEditorUi);
        stroke3.style.backgroundPosition = "0px -115px";

        L.DomUtil.create('br', 'bla', this.options.styleEditorUi);

        L.DomEvent.addListener(stroke1, 'click', function(e) {
            this.setStyle('dashArray', '1');
        }, this);
        L.DomEvent.addListener(stroke2, 'click', function(e) {
            this.setStyle('dashArray', '10,10');
        }, this);
        L.DomEvent.addListener(stroke3, 'click', function(e) {
            this.setStyle('dashArray', '15, 10, 1, 10');
        }, this);
    },

    createOpacity: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Opacity:';

        this.createNumberInput(this.options.styleEditorUi, function(e) {
            var value = e.target.value;
            this.setStyle('opacity', value);
        }.bind(this), this.options.currentElement.target.options.opacity, 0, 1, 0.1);
    },

    createLineWidth: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Linewidth:';

        this.createNumberInput(this.options.styleEditorUi, function(e) {
            var value = e.target.value;
            if (1 <= value && value < 20) {
                this.setStyle('weight', value);
            }
        }.bind(this), this.options.currentElement.target.options.weight, 0, 20, 1.0);
    },

    createTextEdit: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Text:';

        this.createTextInput(this.options.styleEditorUi, function(e) {
            var value = e.target.value;
            this.setText(value);
        }.bind(this), this.options.currentElement.target.feature.properties.text);
    },

    createNumericPropertyChange: function(labelText, property, minValue, maxValue, increment) {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = labelText;

        this.createNumberInput(this.options.styleEditorUi, function(e) {
            var value = e.target.value;
            if (minValue <= value && value <= maxValue) {
                this.setProperty(property, value);
            }
        }.bind(this), this.options.currentElement.target.feature.properties[property], minValue, maxValue, increment);
    },

    createFillColor: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Fill Color:';

        this.createColorPicker(this.options.styleEditorUi, function(e) {
            var color = this.rgbToHex(e.target.style.backgroundColor);
            this.setStyle('fillColor', color);
        }.bind(this));
    },

    createFillOpacity: function() {
        var label = L.DomUtil.create('label', 'leaflet-styleeditor-label', this.options.styleEditorUi);
        label.innerHTML = 'Fill Opacity:';

        this.createNumberInput(this.options.styleEditorUi, function(e) {
            var value = e.target.value;
            this.setStyle('fillOpacity', value);
        }.bind(this), this.options.currentElement.target.options.fillOpacity, 0, 1, 0.1);
    },

    createColorPicker: function(parentDiv, callback) {
        var colorPickerDiv = L.DomUtil.create('div', 'leaflet-styleeditor-colorpicker', parentDiv);
        this.options.colorRamp.forEach(function(color) {
            var elem = L.DomUtil.create('div', 'leaflet-styleeditor-color', colorPickerDiv);
            elem.style.backgroundColor = color;

            L.DomEvent.addListener(elem, 'click', function(e) { e.stopPropagation(); callback(e); });
        }, this);

        L.DomUtil.create('br', '', parentDiv);
        L.DomUtil.create('br', '', parentDiv);

        return colorPickerDiv;
    },

    createBooleanInput: function(parentDiv, callback, value) {
        var numberInput = L.DomUtil.create('input', '', parentDiv);
        numberInput.setAttribute('type', 'checkbox');
        if (value === 'true' || value === true) {
            numberInput.setAttribute('checked', 'true');
        }

        L.DomEvent.addListener(numberInput, 'change', function(e) { 
            e.stopPropagation();
            callback(e);
        });
        L.DomUtil.create('br', '', parentDiv);
        L.DomUtil.create('br', '', parentDiv);
        return numberInput;
    },

    createNumberInput: function(parentDiv, callback, value, min, max, step) {
        var numberInput = L.DomUtil.create('input', 'leaflet-styleeditor-input', parentDiv);
        numberInput.setAttribute('type', 'number');
        numberInput.setAttribute('value', value);
        numberInput.setAttribute('min', min);
        numberInput.setAttribute('max', max);
        numberInput.setAttribute('step', step);

        var lastReportedValue = value;

        var executeCallbackIfRequired = function(e){
            e.stopPropagation();
            // We only execute the callback if the value has actually changed (key up often does not change any value).
            if (lastReportedValue!==e.target.value) {
                callback(e);
            }
            lastReportedValue=e.target.value;
        };

        L.DomEvent.addListener(numberInput, 'change', executeCallbackIfRequired);
        L.DomEvent.addListener(numberInput, 'keyup', executeCallbackIfRequired);
        L.DomUtil.create('br', '', parentDiv);
        L.DomUtil.create('br', '', parentDiv);

        // We store an update method in the returned control, so that the model can be set back after callback.
        // E.g. Chaning the width will change the height in the model if keepaspect==true, so after the callback we want to set all values
        // from the model back to the controls.
        numberInput.updateValue = function(numberInput, newValue){
            if (numberInput.value !== newValue) {
                numberInput.value = newValue;
            }
        }.bind(this, numberInput);

        return numberInput;
    },

    createTextInput: function(parentDiv, callback, value) {
        var numberInput = L.DomUtil.create('input', 'leaflet-styleeditor-input', parentDiv);
        numberInput.setAttribute('value', value);
        L.DomEvent.addListener(numberInput, 'change', function(e) { e.stopPropagation(); callback(e); });
        L.DomEvent.addListener(numberInput, 'keyup', function(e) { e.stopPropagation(); callback(e); });

        L.DomUtil.create('br', '', parentDiv);
        L.DomUtil.create('br', '', parentDiv);

        return numberInput;
    },

    createSelectInput: function(parentDiv, callback, options, value) {
        var selectBox = L.DomUtil.create('select', 'leaflet-styleeditor-select', parentDiv);

        options.forEach(function(option) {
            var displayName = option;
            var valueTag = option;
            if (option.displayname) {
                displayName = option.displayname;
                valueTag = option.value;
            }
            var selectOption = L.DomUtil.create('option', 'leaflet-styleeditor-option', selectBox);
            selectOption.setAttribute('value', valueTag);
            if (value && value.toLowerCase() === valueTag) {
                selectOption.setAttribute('selected', 'true');
            }
            selectOption.innerHTML = displayName;
        }, this);

        L.DomEvent.addListener(selectBox, 'change', function(e) { e.stopPropagation(); callback(e); });

        return selectBox;
    },

    setStyle: function(option, value) {
        var newStyle = {};
        newStyle[option] = value;
        var currentElement = this.options.currentElement.target;
        currentElement.setStyle(newStyle);
        this.fireChangeEvent(currentElement);
    },

    setText: function(value) {
        var currentElement = this.options.currentElement.target;
        currentElement.feature.properties.text = value;
        this.fireChangeEvent(currentElement);
    },

    setProperty: function(name, value) {
        var currentElement = this.options.currentElement.target;
        currentElement.feature.properties[name] = value;
        this.fireChangeEvent(currentElement);
    },

    fireChangeEvent: function(element){
        this.options.currentElement.target._map.fireEvent('styleeditor:changed', {layer: element});
    },

    componentToHex: function(c) {
        var hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    },

    rgbToHex: function(rgb) {
        rgb = rgb.substring(4).replace(")", "").split(",");
        return "#" + this.componentToHex(parseInt(rgb[0], 10)) + this.componentToHex(parseInt(rgb[1], 10)) + this.componentToHex(parseInt(rgb[2], 10));
    }

});
