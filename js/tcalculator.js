let tcalculator = function() {
    let __const_voltage_discharge = {'48':43.2, '60':54};
    let __battery_params_list = null;
    let __chart_holder = null;

    let __chart_config = {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'ток разряда АКБ',
                data: [],
                backgroundColor: 'red',
                borderColor: 'red',
                fill: false,
                borderDash: [5, 5],
                pointRadius: 5,
                pointHoverRadius: 10,
            },
                {
                    label: 'расчетный ток',
                    fill: false,
                    backgroundColor: 'blue',
                    borderColor: 'blue',
                    data: [],
                }
            ]
        },
        options: {
            responsive: true,
            legend: {position: 'top',},
            hover: {mode: 'index'},
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {display: true,labelString: 'Время'}
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {display: true,labelString: 'Ток (А)'}
                }]
            },
            title: {display: true,text: ''}
        }
    };

    function __timeConvert(n) {
        let hours = (n / 60);
        let rhours = Math.floor(hours);
        let minutes = (hours - rhours) * 60;
        let rminutes = Math.round(minutes);

        return n < 60 ? n+'мин' : (rminutes === 0 ? rhours+'ч' : rhours+'ч '+ rminutes + 'м');
    }

    function __reset_selection(sel){
        $('#'+sel+' option').each(function (i, o) {
            if (!isNaN(parseInt($(o).val()))){
                $(o).remove();
            }
        })
    }

    function __disable_selection(sel, flg) {
        $('#'+sel).prop("disabled", flg);
        $('#'+sel).formSelect();
    }

    return {
        init: function () {
            $('select').formSelect();

            $('#premove').mask('00000');
            $('#pcurrent').mask('00000');
            $('#pproj').mask('00000');

            __chart_holder = new Chart(document.getElementById('canvas').getContext('2d'), __chart_config);

            $('#calculate').click(function () {
                if (tcalculator.validate()){
                    tcalculator.calculateTime();
                }
            });

            $('#reset').click(function () {
                $(['vendor', 'btype', 'bcapacity', 'bgroups']).each(function (i, o) {
                    __reset_selection(o);
                    __disable_selection(o, true);
                });

                $('#voltage').val('');
                $('#voltage').formSelect();

                $(['pcurrent', 'premove', 'pproj','psumm', 'treserv']).each(function (i, o) {
                    $('#'+o).val('');
                });

                $('.chart-wrapper').hide();
            });

            $('#voltage').change(function () {
                if (!isNaN(parseInt($('#voltage').val()))) {
                    tcalculator.loadVendors();
                } else {
                    $(['vendor', 'btype', 'bcapacity', 'bgroups']).each(function (i, o) {
                        __reset_selection(o);
                        __disable_selection(o, true);
                    });
                }
            });
        },
        resetValidation: function(){
            $('.chart-wrapper').hide();

            $(['voltage', 'vendor', 'btype', 'bcapacity', 'bgroups']).each(function (i, o) {
                $('#'+o).parent().find('input:first').removeClass('invalid');
            });

            $(['pcurrent', 'premove', 'pproj']).each(function (i, o) {
                    $('#'+o).removeClass('invalid');
            });

        },
        validate: function () {
            tcalculator.resetValidation();
            let is_validate = true;

            $(['voltage', 'vendor', 'btype', 'bcapacity', 'bgroups']).each(function (i, o) {
                if (isNaN(parseInt($('#'+o+' option:selected').val()))){
                    is_validate = false;
                    $('#'+o).parent().find('input:first').addClass('invalid');
                }
            });

            $(['pcurrent', 'premove', 'pproj']).each(function (i, o) {
                if (isNaN(parseInt($('#'+o).val()))){
                    is_validate = false;
                    $('#'+o).addClass('invalid');
                }
            });

            return is_validate;
        },
        calculateTime:function () {
            let p_sum       = parseFloat($('#pcurrent').val()) - parseFloat($('#premove').val()) + parseFloat($('#pproj').val());
            let i_discharge = p_sum/__const_voltage_discharge[$('#voltage option:selected').val()];

            console.log('Ток разряда Ip:'+i_discharge);

            $('#psumm').val(p_sum);
            $('#treserv').val(tcalculator.getTimeByAmperage(i_discharge));

            tcalculator.showChart(Math.round(i_discharge*100)/100);

        },
        showChart: function (id) {
            let pid = $('#bcapacity option:selected').val();

            if (!isNaN(pid) && parseInt(pid) > 0 ){
                $(__battery_params_list).each(function (i, o) {
                    if (o.pid === pid) {
                        __chart_config.options.title.text='График разряда АКБ ('+o.name+')';
                        __chart_config.data.labels = [];
                        __chart_config.data.datasets[0].data = [];
                        __chart_config.data.datasets[1].data = [];
                        for (let v in o.discharge){
                            __chart_config.data.labels.push(__timeConvert(parseInt(v)));
                            __chart_config.data.datasets[0].data.push(parseFloat(o.discharge[v]));
                            __chart_config.data.datasets[1].data.push(parseFloat(id));
                        }
                    }
                })
            }

            __chart_holder.update(__chart_config);
            $('.chart-wrapper').show();

        },
        getTimeByAmperage: function (id) {
            let pid = $('#bcapacity option:selected').val();
            let tres = 0;

            if (!isNaN(pid) && parseInt(pid) > 0 ){
                $(__battery_params_list).each(function (i, o) {
                    if (o.pid === pid) {
                        let x = [];
                        let y = [];
                        let pi = 99999999;
                        let pt = 0;

                        for (let v in o.discharge){
                            if (id <= pi && id >= parseFloat(o.discharge[v])) {
                                x.push(pt);
                                y.push(pi);
                                x.push(parseInt(v));
                                y.push(parseFloat(o.discharge[v]));
                            }
                            pi = parseFloat(o.discharge[v]);
                            pt = parseInt(v);
                        }

                        if( x[0] === 0 ) {
                            tres = 'Большая нагрузка';
                        }else if( x.length === 0 ) {
                            tres = '∞';
                        } else {
                            tres = __timeConvert(parseInt(x[0] + (id - y[0]) * ((x[1] - x[0]) / (y[1] - y[0]))));
                        }
                    }

                });

                return tres;
            }
        },
        onVendorSelected: function() {
            let vid = $('#vendor option:selected').val();

            if (!isNaN(vid) && parseInt(vid)>0){
                tcalculator.loadBatteryTypes(vid);
            } else {
                __disable_selection('btype', true);
            }
        },
        onBattetyTypeSelected: function() {
            let vid = $('#vendor option:selected').val();
            let tid = $('#btype option:selected').val();

            if (!isNaN(vid) && !isNaN(tid) && parseInt(vid)>0 && parseInt(tid)>0){
                tcalculator.loadBatteryParams(vid, tid);
            } else {
                __disable_selection('bcapacity', true);
            }
        },
        loadBatteryParams: function (vid, tid) {
            $.get('data/battery_params.json', {}, function (bparams_list) {
                __reset_selection('bcapacity');

                __battery_params_list = bparams_list;

                $(bparams_list).each(function (i,o) {
                    if (o.vid === vid && o.tid === tid) {
                        $('#bcapacity').append('<option value="' + o.pid+ '">' + o.capacity + '</option>');
                    }
                }).promise().done(function () {
                    __disable_selection('bcapacity', false);

                    $('#bcapacity').change(function () {
                        if (!isNaN(parseInt($('#bcapacity').val()))) {
                            tcalculator.loadBatteryGroups();
                        } else {
                            $(['bgroups']).each(function (i, o) {
                                __reset_selection(o);
                                __disable_selection(o, true);
                            });
                        }
                    });
                });
            });
        },
        loadBatteryTypes: function(vid){
            $.get('data/battery_types.json', {}, function (btypes_list) {
                __reset_selection('btype');

                $(btypes_list).each(function (i,o) {
                    if (o.id === vid) {
                        $('#btype').append('<option value="' + o.tid + '">' + o.name + '</option>');
                    }
                }).promise().done(function () {
                    __disable_selection('btype', false);

                    $('#btype').change(function () {
                        if (!isNaN(parseInt($('#btype').val()))) {
                            tcalculator.onBattetyTypeSelected();
                        } else {
                            $(['bcapacity', 'bgroups']).each(function (i, o) {
                                __reset_selection(o);
                                __disable_selection(o, true);
                            });
                        }
                    });
                });
            });
        },
        loadVendors: function () {
            $.get('data/battery_vendors.json', {}, function (vendor_list) {
                __reset_selection('vendor');

                $(vendor_list).each(function (i,o) {
                    $('#vendor').append('<option value="'+o.id+'">'+o.vendor+'</option>');
                }).promise().done(function () {
                    __disable_selection('vendor', false);

                    $('#vendor').change(function () {
                        if (!isNaN(parseInt($('#vendor').val()))) {
                            tcalculator.onVendorSelected();
                        } else {
                            $(['btype', 'bcapacity', 'bgroups']).each(function (i, o) {
                                __reset_selection(o);
                                __disable_selection(o, true);
                            });
                        }
                    });
                })
            });
        },
        loadBatteryGroups: function () {
            __reset_selection('bgroups');
            $([1,2,3,4]).each(function (i,o) {
                $('#bgroups').append('<option value="'+o+'">'+o+'</option>');
            }).promise().done(function () {
                __disable_selection('bgroups', false);
            });
        }
    }
}();

$(document).ready(function(){
    tcalculator.init();
});
