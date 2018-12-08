'use strict';

const e = React.createElement;

function pad(str, n)
{
    if(str === -1) return -1;
    while (str.length < n) str = "0" + str;
    return str;
}

function regToBin(reg)
{
    switch(reg.trim()) {
        case 'A':
            return '00';
        case 'R1':
            return '01';
        case 'R2':
            return '10';
        case 'R3':
            return '11';
    }
    return -1;
}

function selToBin(sel)
{
    switch(sel.trim()) {
        case 'X':
            return '100';
        case '1':
            return '101';
        case '15':
            return '110';
        case 'carry':
            return '111';
        default:
            return pad(regToBin(sel), 3);
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {code: [], instructions: [], nLines: 32, error: "", outputType: 0}
        this.handleChange = this.handleChange.bind(this);
        this.handleOutputChange = this.handleOutputChange.bind(this);
    }

    handleChange(lines) {
        this.setState({code: lines});
        this.assemble(lines);
    }

    handleOutputChange(event) {
        this.setState({outputType: event.target.value})
    }

    assemble(lines) {
        let code = lines;
        let result = [];
        let labels = [];
        for(let i = 0; i < code.length; i++)
        {
            let line = code[i].split(':');
            if(line.length == 1) continue;
            if(line.length == 2) {
                labels[line[0].trim()] = i;
                code[i] = line[1].trim();
            } else {
                this.setState({error: "Erro: Label mal definidas na linha" + i});
                return;
            }
        }

        for(let i = 0; i < code.length; i++)
        {
            let line = code[i];
            if(line === '' || line === undefined) {
                result[i] = "000_000_00";
                continue;
            }
            let opr, sel, ce, temp;
            if(line.startsWith("jnz ")) {
                let label = line.substring(3).trim();
                if (label.length == 0 || labels[label] === undefined) {
                    this.setState({ error: "Erro: A label não existe na linha " + i });
                    return;
                }
                result[i] = "101_" + pad(labels[label].toString(2), 5);
                continue;
            }

            line = line.split("<-");
            if(line.length != 2)
            {
                this.setState({ error: "Erro: Sintaxe errada na linha " + i });
                return;
            }


            if((ce = regToBin(line[0])) === -1) {
                this.setState({ error: "Erro: Registo não existe na linha " + i });
                return;
            }

            if ((temp = line[1].split("-")).length == 2 && temp[0].trim() == 'A') {
                opr = '001';
            } else if((temp = line[1].split("+")).length == 2 && temp[0].trim() == 'A') {
                opr = '010';
            } else if ((temp = line[1].split("^")).length == 2 && temp[0].trim() == 'A') {
                opr = '011';
            } else if ((temp = line[1].split(">>")).length == 2 && temp[0].trim() == 'A' && temp[1].trim() == '1') {
                opr = '100';
            } else if ((temp = line[1].split("&")).length == 2 && temp[0].trim() == 'A') {
                opr = '110';
                temp = [0, '000'];
            } else if ((temp = line[1].split("|")).length == 2 && temp[0].trim() == 'A') {
                opr = '111';
            } else {
                opr = '000';
                temp = [0, line[1]];
            }
            sel = selToBin(temp[1]);
            if(sel === -1) {
                this.setState({ error: "Erro: Sintaxe errada na linha " + i });
                return;
            }
            result[i] = opr + "_" + sel + "_" + ce;
        }

        this.setState({instructions: result, error: ""});
    }

    render() {
        return e(
            'div',
            { className: 'row mt-4' },
            e(
                'div',
                { className: 'col-6' },
                e(
                    'h3',
                    {},
                    'Editor'
                ),
                e(
                    AssemblerEditor,
                    { onChange: this.handleChange, nLines: this.state.nLines }
                )
            ),
            e(
                'div',
                { className: 'col-6 d-flex flex-column' },
                e(
                    'span',
                    {},
                    e(
                        'h3',
                        {},
                        
                        'Output'
                    ),
                    e(
                        'input',
                        {type: 'radio', checked: this.state.outputType == 0, onChange: this.handleOutputChange, value: 0},
                    ),
                    e(
                        'span',
                        { className: "mx-1" },
                        "Binário"
                    ),
                    e(
                        'input',
                        {type: 'radio', checked: this.state.outputType == 1, onChange: this.handleOutputChange, value: 1},
                    ),
                    e(
                        'span',
                        { className: "mx-1" },
                        "Verilog (case)"
                    ),
                ),
                e(
                    AssemblerView,
                    { code: this.state.code, instructions: this.state.instructions, error: this.state.error, outputType: this.state.outputType }
                )
            )
        )
    }
}

class AssemblerEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = { value: "" };
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        let lines = event.target.value.split("\n");
        if(lines != undefined && lines.length > 32) return;
        this.setState({ value: event.target.value });
        this.props.onChange(event.target.value.split('\n'));

    }

    render() {

        const linenumbers = [];
        for(var i = 0; i < this.props.nLines; i++)
            linenumbers.push(e(
                'div',
                { className: 'editor-linenumbers-number', key: i },
                i
            ));

        return e(
            'div',
            { className: 'editor'},
            e(
                'div',
                { className: 'editor-linenumbers' },
                linenumbers
            ),
            e(
                'textarea',
                { rows: this.state.rows, value: this.state.value, onChange: this.handleChange }
            )
        );
    }
}

class AssemblerView extends React.Component
{
    constructor(props) {
        super(props);
    }

    
    render() {
        let bin;
        
        if(this.props.error !== "") {
            bin = e('span', { className: 'error' }, this.props.error)
        } else {
            bin = this.props.instructions.map((line, i) => {
                if(this.props.outputType == 1)
                    line = i + ": dado = 8'" + line + ";" + " //" + this.props.code[i];
                return e(
                    'span',
                    { key: i },
                    line,
                    e(
                        'br'
                    )
                );
            });
        }

        return(
            e(
                'div',
                { className: 'compiled' },
                bin
            )
        )
    }
}

const domContainer = document.querySelector('#app');
ReactDOM.render(e(App), domContainer);