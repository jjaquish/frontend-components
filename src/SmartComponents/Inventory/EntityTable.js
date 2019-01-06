import React from 'react';
import PropTypes from 'prop-types';
import routerParams from '../../Utilities/RouterParams';
import { selectEntity, setSort, detailSelect } from '../../redux/actions/inventory';
import { connect } from 'react-redux';
import { Table } from '../../PresentationalComponents/Table';
import keyBy from 'lodash/keyBy';
import mapValues from 'lodash/mapValues';
import TableActions from './Actions';
import HealthStatus from './HealthStatus';
import get from 'lodash/get';
import ContentLoader from 'react-content-loader';
import orderBy from 'lodash/orderBy';

const RowLoader = props => (
    <ContentLoader
        height={ 20 }
        width={ 480 }
        { ...props }
    >
        <rect x="30" y="0" rx="3" ry="3" width="250" height="7" />
        <rect x="300" y="0" rx="3" ry="3" width="70" height="7" />
        <rect x="385" y="0" rx="3" ry="3" width="95" height="7" />
        <rect x="50" y="12" rx="3" ry="3" width="80" height="7" />
        <rect x="150" y="12" rx="3" ry="3" width="200" height="7" />
        <rect x="360" y="12" rx="3" ry="3" width="120" height="7" />
        <rect x="0" y="0" rx="0" ry="0" width="20" height="20" />
    </ContentLoader>
);

class EntityTable extends React.Component {
    onRowClick = (_event, key, application) => {
        const { match: { url }, history, onDetailSelect, loaded } = this.props;
        if (loaded) {
            const dilimeter = url.substr(-1, 1) === '/' ? '' : '/';
            history.push(`${url}${dilimeter}${key}/${application ? application : ''}`);
            onDetailSelect && onDetailSelect(application);
        }
    }

    onItemSelect = (_event, key, checked) => {
        this.props.selectEntity && this.props.selectEntity(key, checked);
    }

    onSort = (_event, key, direction) => {
        if (key !== 'action' && key !== 'health') {
            this.props.setSort && this.props.setSort(key, direction);
        }
    }

    renderCol = (col, key, composed, isTime) => {
        if (!col.hasOwnProperty('isOpen')) {
            if (composed) {
                return (
                    <div className="ins-composed-col">
                        { composed.map(path => (
                            <div key={ path }
                                widget="col"
                                data-key={ path }
                                onClick={ event => this.onRowClick(event, col.id) }
                            >
                                { get(col, path, 'unknown') || '\u00A0' }
                            </div>
                        )) }
                    </div>
                );
            }

            if (isTime) {
                return (new Date(get(col, key, 'unknown'))).toLocaleString();
            }
        }

        return get(col, key, 'unknown');
    }

    onHealthClicked = (event, _clickedOn, health, item) => {
        this.onRowClick(event, item.id, health.redirect);
    }

    healthColumn = (oneItem) => {
        return {
            title: <HealthStatus
                items={ oneItem.health }
                className="ins-health-status"
                onHealthClicked={
                    (event, clickedOn, health) => this.onHealthClicked(event, clickedOn, health, oneItem)
                }
            />,
            className: 'pf-m-fit-content',
            stopPropagation: true
        };
    }

    actionsColumn = (oneItem) => {
        return {
            title: <TableActions item={ { id: oneItem.id } } />,
            className: 'pf-c-table__action pf-m-shrink',
            stopPropagation: true
        };
    }

    buildCells = (item) => {
        const { columns, showHealth } = this.props;
        let actions; let health; let cells;
        if (!item.hasOwnProperty('isOpen')) {
            actions = this.actionsColumn(item);
            health = showHealth && this.healthColumn(item);
            cells = columns.map(({ key, composed, isTime }) => this.renderCol(item, key, composed, isTime));
        } else {
            cells = [{
                title: item.title,
                colSpan: columns.length + 1 + showHealth
            }];
        }

        return [
            ...cells,
            health,
            actions
        ].filter(Boolean);
    }

    createRows = () => {
        const { sortBy, rows } = this.props;
        const data = rows
        .filter(oneRow => oneRow.account)
        .map((oneItem) => ({
            ...oneItem,
            cells: this.buildCells(oneItem)
        }));
        return sortBy ?
            orderBy(
                data,
                [ e => get(e, sortBy.key) ],
                [ sortBy.direction ]
            ) :
            data;
    }

    render() {
        const { columns, showHealth, loaded, sortBy, expandable, onExpandClick } = this.props;
        return <Table
            className="pf-m-compact ins-entity-table"
            expandable={ expandable }
            onExpandClick={ onExpandClick }
            sortBy={
                sortBy ?
                    {
                        index: sortBy.key,
                        direction: sortBy.direction === 'asc' ? 'up' : 'down'
                    } :
                    {}
            }
            header={ columns && {
                ...mapValues(keyBy(columns, item => item.key), item => item.title),
                ...showHealth ? {
                    health: {
                        title: 'Health',
                        hasSort: false
                    }
                } : {},
                action: ''
            } }
            onSort={ this.onSort }
            onItemSelect={ this.onItemSelect }
            hasCheckbox={ loaded }
            rows={
                loaded ?
                    this.createRows() :
                    [ ...Array(5) ].map(() => ({
                        cells: [{
                            title: <RowLoader />,
                            colSpan: columns.length + showHealth + 1
                        }]
                    }))
            }
        />;
    }
}

EntityTable.propTypes = {
    history: PropTypes.any,
    expandable: PropTypes.bool,
    onExpandClick: PropTypes.func,
    setSort: PropTypes.func,
    rows: PropTypes.arrayOf(PropTypes.any),
    columns: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string,
        composed: PropTypes.arrayOf(PropTypes.string)
    })),
    showHealth: PropTypes.bool,
    match: PropTypes.any,
    loaded: PropTypes.bool,
    sortBy: PropTypes.shape({
        key: PropTypes.string,
        direction: PropTypes.oneOf([ 'asc', 'desc' ])
    }),
    selectEntity: PropTypes.func,
    onDetailSelect: PropTypes.func
};

EntityTable.defaultProps = {
    loaded: false,
    showHealth: false,
    expandable: false,
    columns: [],
    rows: [],
    onExpandClick: () => undefined,
    selectEntity: () => undefined,
    onDetailSelect: () => undefined
};

function mapDispatchToProps(dispatch) {
    return {
        selectEntity: (id, isSelected) => dispatch(selectEntity(id, isSelected)),
        setSort: (id, isSelected) => dispatch(setSort(id, isSelected)),
        onDetailSelect: (name) => dispatch(detailSelect(name))
    };
}

function mapStateToProps({ entities: { columns, rows, loaded, sortBy }}) {
    return {
        columns,
        loaded,
        rows,
        sortBy
    };
}

export default routerParams(connect(mapStateToProps, mapDispatchToProps)(EntityTable));
