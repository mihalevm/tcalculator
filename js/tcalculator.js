var tcalculator = function(){
    var __const_voltage_discharge = {'48':43.2, '60':54};
    var __battery_params_list = null;

    function __timeConvert(n) {
        var num = n;
        var hours = (num / 60);
        var rhours = Math.floor(hours);
        var minutes = (hours - rhours) * 60;
        var rminutes = Math.round(minutes);

        num = num < 60 ? num+'мин' : (rminutes === 0 ? rhours+'ч' : rhours+'ч '+ rminutes + 'м');

        return num;
    }

    return {
        init: function () {
            tcalculator.loadVendors();
//todo: remove
            $('select').formSelect();

            $('#premove').mask('00000');
            $('#pcurrent').mask('00000');
            $('#pproj').mask('00000');
        },
        resetValidation: function(){
            $('.chart-wrapper').hide();

            $(['voltage', 'vendor', 'btype', 'bcapacity', 'bgroups']).each(function (i, o) {
                $('#'+o).parent().find('input:first').removeClass('invalid');
            })

            $(['pcurrent', 'premove', 'pproj']).each(function (i, o) {
                    $('#'+o).removeClass('invalid');
            });

        },
        validate: function () {
            tcalculator.resetValidation();
            var is_validate = true;

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
            var p_sum = 0;
            var i_discharge = 0;

            $(['pcurrent', 'premove', 'pproj']).each(function (i, o) {
                p_sum += parseFloat($('#'+o).val());
            });

            i_discharge = p_sum/__const_voltage_discharge[$('#voltage option:selected').val()];

            console.log('Ток разряда Ip:'+i_discharge);

            $('#psumm').val(p_sum);
            $('#treserv').val(tcalculator.getTimeByAmperage(i_discharge));

            tcalculator.showChart(Math.round(i_discharge*100)/100);

        },
        showChart: function (id) {
            var pid = $('#bcapacity option:selected').val();

            if (!isNaN(pid) && parseInt(pid) > 0 ){
                $(__battery_params_list).each(function (i, o) {
                    if (o.pid === pid) {
                        config.options.title.text='График разряда АКБ ('+o.name+')';
                        config.data.labels = [];
                        config.data.datasets[0].data = [];
                        config.data.datasets[1].data = [];
                        for (v in o.discharge){
                            config.data.labels.push(__timeConvert(parseInt(v)));
                            config.data.datasets[0].data.push(parseFloat(o.discharge[v]));
                            config.data.datasets[1].data.push(parseFloat(id));
                        }
                    }
                })
            }

            myLine.update(config);
            $('.chart-wrapper').show();

        },
        getTimeByAmperage: function (id) {
            var pid = $('#bcapacity option:selected').val();
            var tres = 0;

            if (!isNaN(pid) && parseInt(pid) > 0 ){
                $(__battery_params_list).each(function (i, o) {
                    if (o.pid === pid) {
                        var x = [];
                        var y = [];
                        var pi = 99999999;
                        var pt = 0;

                        for (v in o.discharge){
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

                })

                return tres;
            }
        },
        onVendorSelected: function() {
            var vid = $('#vendor option:selected').val();

            if (!isNaN(vid) && parseInt(vid)>0){
                tcalculator.loadBatteryTypes(vid);
            } else {
                $('#btype').prop("disabled", true);
                $('#btype').formSelect();
            }
        },
        onBattetyTypeSelected: function() {
            var vid = $('#vendor option:selected').val();
            var tid = $('#btype option:selected').val();

            if (!isNaN(vid) && !isNaN(tid) && parseInt(vid)>0 && parseInt(tid)>0){
                tcalculator.loadBatteryParams(vid, tid);
            } else {
                $('#bcapacity').prop("disabled", true);
                $('#bcapacity').formSelect();
            }
        },
        loadBatteryParams: function (vid, tid) {
            $.get('data/battery_params.json', {}, function (bparams_list) {
                __battery_params_list = bparams_list;

                $('#bcapacity option').each(function (i, o) {
                    if (!isNaN(parseInt($(o).val()))){
                        $(o).remove();
                    }
                })
                $(bparams_list).each(function (i,o) {
                    if (o.vid === vid && o.tid === tid) {
                        $('#bcapacity').append('<option value="' + o.pid+ '">' + o.capacity + '</option>');
                    }
                }).promise().done(function () {
                    $('#bcapacity').prop("disabled", false);
                    $('#bcapacity').formSelect();
                });
            });
        },
        loadBatteryTypes: function(vid){
            $.get('data/battery_types.json', {}, function (btypes_list) {
                $('#btype option').each(function (i, o) {
                    if (!isNaN(parseInt($(o).val()))){
                        $(o).remove();
                    }
                })
                $(btypes_list).each(function (i,o) {
                    if (o.id === vid) {
                        $('#btype').append('<option value="' + o.tid + '">' + o.name + '</option>');
                    }
                }).promise().done(function () {
                    $('#btype').prop("disabled", false);
                    $('#btype').formSelect();
                    $('#btype').change(function (o) {
                        tcalculator.onBattetyTypeSelected();
                    });
                });
            });
        },
        loadVendors: function () {
            $.get('data/battery_vendors.json', {}, function (vendor_list) {
                $(vendor_list).each(function (i,o) {
                    $('#vendor').append('<option value="'+o.id+'">'+o.vendor+'</option>');
                }).promise().done(function () {
                    $('#vendor').formSelect();
                    $('#vendor').change(function (o) {
                        tcalculator.onVendorSelected();
                    });
                })
            });
        }
    }
}();

$(document).ready(function(){
    tcalculator.init();

    $('#calculate').click(function () {
        if (tcalculator.validate()){
            tcalculator.calculateTime();
        };
    });

    window.myLine = new Chart(document.getElementById('canvas').getContext('2d'), config);
});

var config = {
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
        legend: {
            position: 'top',
        },
        hover: {
            mode: 'index'
        },
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Время'
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Ток (А)'
                }
            }]
        },
        title: {
            display: true,
            text: ''
        }
    }
}