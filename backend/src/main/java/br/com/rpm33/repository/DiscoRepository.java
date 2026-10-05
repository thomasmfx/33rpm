package br.com.rpm33.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.Disco;
import br.com.rpm33.model.MotivoStatus;

public interface DiscoRepository
    extends JpaRepository<Disco, Long>, JpaSpecificationExecutor<Disco> {

  /** RNF0021: numeração do código de disco. */
  @Query(value = "SELECT nextval('seq_codigo_disco')", nativeQuery = true)
  Long proximoNumeroDeCodigo();

  List<Disco> findByIsAtivoTrueAndEstoque(Integer estoque);

  /** RN0051: o maior custo de cada disco, numa consulta só para a listagem inteira. */
  @Query("select e.disco.id, max(e.valorCusto) from EntradaEstoque e "
      + "where e.disco.id in :ids group by e.disco.id")
  List<Object[]> maioresCustos(@Param("ids") Collection<Long> ids);

  /** RF0013: a data do pedido mais recente de cada disco. */
  @Query("select i.disco.id, max(i.pedido.dataCadastro) from ItemPedido i "
      + "where i.disco.id in :ids group by i.disco.id")
  List<Object[]> ultimasVendas(@Param("ids") Collection<Long> ids);

  @Query("select m from MotivoStatus m where m.disco.id in :ids order by m.data desc, m.id desc")
  List<MotivoStatus> motivosRecentes(@Param("ids") Collection<Long> ids);
}
